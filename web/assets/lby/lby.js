(function () {
    const apiBase = '/lb/lightsail'

    new Vue({
        el: '#ping-app',
        delimiters: ['[[', ']]'],
        data: function () {
            return {
                accessToken: '',
                authenticated: false,
                isAdmin: false,
                isDarkMode: window.getSavedDarkMode(),
                autoRefreshEnabled: false,
                autoRefreshTimer: null,
                loading: false,
                errorMessage: '',
                actingKey: '',
                remarkSavingID: '',
                query: { keyword: '', remark: '', groupName: '', offset: 0, limit: 8 },
                dataList: [],
                total: 0,
                selectedIds: [],
                outTimeDialogVisible: false,
                outTimeSaving: false,
                outTimeForm: { id: '', value: null },
                exportDialogVisible: false,
                exportText: ''
            }
        },
        computed: {
            panelPath: function () {
                return this.accessToken ? '/lb/' + encodeURIComponent(this.accessToken) : '#'
            },
            stats: function () {
                return this.dataList.reduce(function (result, instance) {
                    const status = String(instance.status || '').toLowerCase()
                    if (status === 'running' || status === 'normal' || status === 'enabled') result.running += 1
                    if (instance.isOpen === 1) result.openPorts += 1
                    return result
                }, { running: 0, openPorts: 0 })
            }
        },
        created: function () {
            window.applyDarkTheme(this.isDarkMode)
            this.accessToken = this.$el.dataset.queryId || ''
            try { this.autoRefreshEnabled = localStorage.getItem('lbyAutoRefresh') === 'true' } catch (e) {}
        },
        mounted: function () {
            if (this.accessToken) this.initialize()
            else this.errorMessage = '访问地址缺少令牌'
            this.syncAutoRefresh()
        },
        beforeDestroy: function () {
            this.clearAutoRefresh()
        },
        methods: {
            authConfig: function () {
                return { headers: { Authorization: this.accessToken }, timeout: 30000 }
            },
            initialize: async function () {
                this.errorMessage = ''
                try {
                    const response = await axios.post(apiBase + '/profile', {}, this.authConfig())
                    this.isAdmin = Boolean(response.data.data && response.data.data.isAdmin)
                    this.authenticated = true
                    await this.search()
                } catch (error) {
                    this.handleError(error, true)
                }
            },
            search: function () {
                this.query.offset = 0
                this.selectedIds = []
                return this.loadPage(true)
            },
            loadMore: function () {
                if (this.loading || this.dataList.length >= this.total) return
                this.query.offset = this.dataList.length
                return this.loadPage(false)
            },
            loadPage: async function (reset, options) {
                const opts = options || {}
                if (!this.authenticated || this.loading) return
                if (!opts.silent) this.loading = true
                this.errorMessage = ''
                try {
                    const payload = {
                        keyword: this.query.keyword,
                        remark: this.query.remark,
                        groupName: this.isAdmin ? this.query.groupName : '',
                        offset: reset ? 0 : this.query.offset,
                        limit: opts.limit || this.query.limit
                    }
                    const response = await axios.post(apiBase + '/page', payload, this.authConfig())
                    const rows = response.data.list || []
                    this.dataList = reset ? rows : this.dataList.concat(rows)
                    this.total = response.data.total || 0
                    this.selectedIds = this.selectedIds.filter(id => this.dataList.some(row => row.id === id))
                } catch (error) {
                    this.handleError(error, false)
                } finally {
                    if (!opts.silent) this.loading = false
                }
            },
            refreshCurrent: async function () {
                if (!this.authenticated || this.loading) return
                const size = Math.max(this.dataList.length, this.query.limit)
                await this.loadPage(true, { silent: true, limit: size })
            },
            confirmAction: function (instance, action) {
                const labels = { restart: '重启', changeIp: '更换 IP', openport: '开启端口' }
                this.$confirm('确认' + labels[action] + '实例 #' + instance.id + '？', '确认操作', {
                    confirmButtonText: labels[action],
                    cancelButtonText: '取消',
                    type: action === 'changeIp' ? 'warning' : 'info'
                }).then(() => this.runAction(instance, action)).catch(function () {})
            },
            runAction: async function (instance, action) {
                this.actingKey = instance.id + ':' + action
                try {
                    const response = await axios.post(apiBase + '/' + action, { id: instance.id }, this.authConfig())
                    this.$message.success(response.data.message || '操作指令已发送')
                    await new Promise(resolve => setTimeout(resolve, 800))
                    await this.refreshCurrent()
                } catch (error) {
                    this.handleError(error, false, true)
                } finally {
                    this.actingKey = ''
                }
            },
            checkNet: async function (instance) {
                this.actingKey = instance.id + ':checkNet'
                try {
                    const response = await axios.post(apiBase + '/checkNet', {
                        id: instance.id,
                        publicIpAddress: instance.publicIpAddress
                    }, this.authConfig())
                    const reachable = response.data.data && response.data.data.reachable
                    this.$message({ type: reachable ? 'success' : 'warning', message: response.data.message })
                } catch (error) {
                    this.handleError(error, false, true)
                } finally {
                    this.actingKey = ''
                }
            },
            saveRemark: async function (instance) {
                if (this.remarkSavingID) return
                this.remarkSavingID = instance.id
                try {
                    const response = await axios.post(apiBase + '/editRemark', {
                        id: instance.id,
                        remark: instance.remark || ''
                    }, this.authConfig())
                    this.$message.success(response.data.message || '备注已更新')
                } catch (error) {
                    this.handleError(error, false, true)
                } finally {
                    this.remarkSavingID = ''
                }
            },
            openOutTime: function (instance) {
                this.outTimeForm.id = instance.id
                this.outTimeForm.value = this.formatInputDate(instance.outTime)
                this.outTimeDialogVisible = true
            },
            saveOutTime: async function () {
                this.outTimeSaving = true
                try {
                    const response = await axios.post(apiBase + '/fixOutTime', {
                        id: this.outTimeForm.id,
                        outTime: this.outTimeForm.value || null
                    }, this.authConfig())
                    this.$message.success(response.data.message || '到期时间已保存')
                    this.outTimeDialogVisible = false
                    await this.refreshCurrent()
                } catch (error) {
                    this.handleError(error, false, true)
                } finally {
                    this.outTimeSaving = false
                }
            },
            toggleSelected: function (id, selected) {
                if (selected && this.selectedIds.indexOf(id) < 0) this.selectedIds.push(id)
                if (!selected) this.selectedIds = this.selectedIds.filter(value => value !== id)
            },
            isSelected: function (id) {
                return this.selectedIds.indexOf(id) >= 0
            },
            openExport: function (withPanel) {
                const selected = this.dataList.filter(row => this.selectedIds.indexOf(row.id) >= 0)
                const groups = {}
                selected.forEach(row => {
                    const groupName = row.groupName ? row.groupName.split('@')[0] : '未分组'
                    const title = groupName + '@aws ' + this.zoneName(row.displayName) + ' ' + (row.peiZhi || '--')
                    if (!groups[title]) groups[title] = []
                    groups[title].push(row)
                })
                const site = window.location.origin
                this.exportText = Object.keys(groups).map(title => {
                    const rows = groups[title]
                    const groupName = title.split('@')[0]
                    const first = rows[0]
                    const lines = [title.split('@').slice(1).join('@')]
                    rows.forEach(row => lines.push('#' + row.id + ' ' + (row.publicIpAddress || '--')))
                    lines.push('|22|' + (first.username || '') + '|' + (first.password || ''))
                    lines.push('到期时间：' + this.formatDate(first.outTime))
                    if (withPanel && groupName !== '未分组') {
                        lines.push('', '面板：' + site + '/lb/' + encodeURIComponent(groupName))
                    }
                    return lines.join('\n')
                }).join('\n\n')
                this.exportDialogVisible = true
            },
            copyExport: function () {
                this.copyText(this.exportText)
            },
            copyText: async function (text) {
                if (!text) return
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text)
                    } else {
                        const input = document.createElement('textarea')
                        input.value = text
                        input.style.position = 'fixed'
                        input.style.opacity = '0'
                        document.body.appendChild(input)
                        input.select()
                        document.execCommand('copy')
                        document.body.removeChild(input)
                    }
                    this.$message.success('已复制')
                } catch (error) {
                    this.$message.error('复制失败，请手动复制')
                }
            },
            handleError: function (error, duringAuth, toast) {
                const status = error.response && error.response.status
                const payload = error.response && error.response.data
                const message = (payload && payload.message) || error.message || '请求 LBY 服务失败'
                if (status === 401) {
                    this.authenticated = false
                    this.isAdmin = false
                    this.dataList = []
                    this.total = 0
                    this.errorMessage = message
                }
                if (duringAuth || toast) this.$message.error(message)
                else this.errorMessage = message
            },
            toggleTheme: function () {
                this.isDarkMode = !this.isDarkMode
                window.applyDarkTheme(this.isDarkMode)
                try { localStorage.setItem('darkMode', String(this.isDarkMode)) } catch (e) {}
            },
            toggleAutoRefresh: function () {
                this.autoRefreshEnabled = !this.autoRefreshEnabled
                try { localStorage.setItem('lbyAutoRefresh', String(this.autoRefreshEnabled)) } catch (e) {}
                this.syncAutoRefresh()
            },
            syncAutoRefresh: function () {
                this.clearAutoRefresh()
                if (!this.autoRefreshEnabled) return
                this.autoRefreshTimer = window.setInterval(() => this.refreshCurrent(), 60000)
            },
            clearAutoRefresh: function () {
                if (this.autoRefreshTimer) window.clearInterval(this.autoRefreshTimer)
                this.autoRefreshTimer = null
            },
            statusLabel: function (instance) {
                if (instance.changingIp === 1) return '更换 IP 中'
                return instance.statusText || instance.status || '--'
            },
            statusClass: function (instance) {
                if (instance.changingIp === 1) return 'status-badge--pending'
                const status = String(instance.status || '').toLowerCase()
                if (status === 'running' || status === 'normal' || status === 'enabled') return 'status-badge--running'
                if (status === 'stopped' || status === 'disabled') return 'status-badge--stopped'
                if (status === 'error' || status === 'failed') return 'status-badge--error'
                return 'status-badge--pending'
            },
            flowLabel: function (instance) {
                const used = instance.flowGb || '0.00'
                const total = instance.bundleGb || '--'
                return used + 'G / ' + total
            },
            zoneName: function (zone) {
                const zones = {
                    virginia: '弗吉尼亚', ohio: '俄亥俄', oregon: '俄勒冈', ireland: '爱尔兰',
                    london: '伦敦', paris: '巴黎', frankfurt: '法兰克福', singapore: '新加坡',
                    sydney: '悉尼', tokyo: '东京', seoul: '首尔', mumbai: '孟买',
                    montreal: '蒙特利尔', stockholm: '斯德哥尔摩', jakarta: '雅加达', 'hong kong': '香港',
                    'ap-northeast-1': '东京', 'ap-northeast-2': '首尔', 'ap-northeast-3': '大阪',
                    'ap-southeast-1': '新加坡', 'ap-southeast-2': '悉尼', 'ap-southeast-3': '雅加达',
                    'ap-south-1': '孟买', 'ap-east-1': '香港', 'us-east-1': '弗吉尼亚',
                    'us-east-2': '俄亥俄', 'us-west-1': '加利福尼亚', 'us-west-2': '俄勒冈',
                    'eu-west-1': '爱尔兰', 'eu-west-2': '伦敦', 'eu-west-3': '巴黎',
                    'eu-central-1': '法兰克福', 'eu-north-1': '斯德哥尔摩', 'sa-east-1': '圣保罗'
                }
                const key = String(zone || '').toLowerCase()
                return zones[key] || zone || '--'
            },
            formatDate: function (value) {
                if (!value) return '--'
                const date = new Date(value)
                if (Number.isNaN(date.getTime())) return '--'
                return new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(date)
            },
            formatInputDate: function (value) {
                if (!value) return null
                const date = new Date(value)
                if (Number.isNaN(date.getTime())) return null
                const pad = value => String(value).padStart(2, '0')
                return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
                    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
            }
        }
    })
})()
