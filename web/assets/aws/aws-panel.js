new Vue({
    el: '#aws-panel',
    delimiters: ['[[', ']]'],
    data: function () {
        return {
            isDarkMode: window.getSavedDarkMode(),
            accessToken: '',
            tokenInput: '',
            tokenDialogVisible: false,
            authenticating: false,
            initialized: false,
            loading: false,
            actingID: '',
            errorMessage: '',
            region: '',
            keyword: '',
            stateFilter: '',
            panelConfig: { defaultRegion: '', regions: [], actionsEnabled: false },
            instances: []
        }
    },
    computed: {
        stats: function () {
            return this.instances.reduce(function (result, instance) {
                result.total += 1
                if (instance.state === 'running') result.running += 1
                else if (instance.state === 'stopped') result.stopped += 1
                else result.transitioning += 1
                return result
            }, { total: 0, running: 0, stopped: 0, transitioning: 0 })
        },
        filteredInstances: function () {
            const keyword = this.keyword.toLowerCase()
            const stateFilter = this.stateFilter
            return this.instances.filter(function (instance) {
                const matchesKeyword = !keyword || [instance.name, instance.id, instance.publicIp, instance.privateIp]
                    .some(function (value) { return String(value || '').toLowerCase().includes(keyword) })
                let matchesState = !stateFilter || instance.state === stateFilter
                if (stateFilter === 'transitioning') {
                    matchesState = instance.state !== 'running' && instance.state !== 'stopped'
                }
                return matchesKeyword && matchesState
            })
        }
    },
    created: function () {
        window.applyDarkTheme(this.isDarkMode)
        try {
            this.accessToken = sessionStorage.getItem('awsPanelToken') || ''
        } catch (e) {}
        if (this.accessToken) this.initialize()
        else this.openTokenDialog()
    },
    methods: {
        authHeaders: function () {
            return { Authorization: 'Bearer ' + this.accessToken }
        },
        initialize: async function () {
            this.authenticating = true
            this.errorMessage = ''
            try {
                const response = await axios.get('/api/v2/aws/config', { headers: this.authHeaders(), timeout: 15000 })
                this.panelConfig = response.data.data
                this.region = this.region || this.panelConfig.defaultRegion
                this.initialized = true
                this.tokenDialogVisible = false
                await this.loadInstances()
            } catch (error) {
                this.handleAPIError(error, true)
            } finally {
                this.authenticating = false
            }
        },
        loadInstances: async function () {
            if (!this.region || !this.accessToken) return
            this.loading = true
            this.errorMessage = ''
            try {
                const response = await axios.get('/api/v2/aws/instances', {
                    headers: this.authHeaders(),
                    params: { region: this.region },
                    timeout: 30000
                })
                this.instances = response.data.data || []
            } catch (error) {
                this.handleAPIError(error, false)
            } finally {
                this.loading = false
            }
        },
        saveToken: function () {
            const token = this.tokenInput.trim()
            if (!token) {
                this.$message.warning('请输入访问令牌')
                return
            }
            this.accessToken = token
            try { sessionStorage.setItem('awsPanelToken', token) } catch (e) {}
            this.initialize()
        },
        openTokenDialog: function () {
            this.tokenInput = this.accessToken
            this.tokenDialogVisible = true
            this.$nextTick(function () {
                if (this.$refs.tokenInput) this.$refs.tokenInput.focus()
            })
        },
        handleAPIError: function (error, duringAuth) {
            const status = error.response && error.response.status
            const data = error.response && error.response.data
            const message = (data && data.message) || error.message || '请求 AWS 服务失败'
            if (status === 401) {
                this.accessToken = ''
                try { sessionStorage.removeItem('awsPanelToken') } catch (e) {}
                this.tokenInput = ''
                this.tokenDialogVisible = true
                this.$message.error('访问令牌无效')
                return
            }
            if (duringAuth) {
                this.$message.error(message)
                this.tokenDialogVisible = true
            } else {
                this.errorMessage = message
            }
        },
        confirmAction: function (instance, action) {
            const labels = { start: '启动', stop: '停止', reboot: '重启' }
            const name = instance.name || instance.id
            this.$confirm('确认' + labels[action] + '实例“' + name + '”？', '确认操作', {
                confirmButtonText: labels[action],
                cancelButtonText: '取消',
                type: action === 'stop' ? 'warning' : 'info'
            }).then(() => this.runAction(instance, action)).catch(function () {})
        },
        runAction: async function (instance, action) {
            this.actingID = instance.id
            try {
                await axios.post('/api/v2/aws/instances/' + encodeURIComponent(instance.id) + '/action', {
                    region: this.region,
                    action: action
                }, { headers: this.authHeaders(), timeout: 25000 })
                this.$message.success('操作已提交')
                await new Promise(function (resolve) { setTimeout(resolve, 1200) })
                await this.loadInstances()
            } catch (error) {
                this.handleAPIError(error, false)
                this.$message.error(this.errorMessage || '实例操作失败')
            } finally {
                this.actingID = ''
            }
        },
        toggleTheme: function () {
            this.isDarkMode = !this.isDarkMode
            window.applyDarkTheme(this.isDarkMode)
            try { localStorage.setItem('darkMode', String(this.isDarkMode)) } catch (e) {}
        },
        stateLabel: function (state) {
            return ({ running: '运行中', stopped: '已停止', pending: '启动中', stopping: '停止中', 'shutting-down': '关闭中' })[state] || state
        },
        regionLabel: function (region) {
            const names = {
                'us-east-1': '美国东部（弗吉尼亚北部）',
                'us-west-2': '美国西部（俄勒冈）',
                'ap-east-1': '亚太地区（香港）',
                'ap-northeast-1': '亚太地区（东京）',
                'ap-southeast-1': '亚太地区（新加坡）'
            }
            return names[region] ? names[region] + ' · ' + region : region
        },
        formatTime: function (value) {
            if (!value || value === '0001-01-01T00:00:00Z') return '-'
            return new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).format(new Date(value))
        }
    }
})
