// 自定义Axios实例
const httpUtils = axios.create({
    baseURL: '',
    timeout: 30000,
    headers: {'Content-Type': 'application/json'}
})

httpUtils.interceptors.request.use(request => {
    return request;
}, error => {
    console.log('error', error)
    return Promise.reject(error)
})

httpUtils.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response.status === 401 || error.response.status === 403) {
        console.log('error', error)
        window.location.href = '/login'
    } else {
        return Promise.reject(error)
    }
})