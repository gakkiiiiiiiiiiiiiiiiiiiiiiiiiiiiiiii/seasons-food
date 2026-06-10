const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const WX_CLOUD_ENV = 'prod-d1gsokwqi19ff8e6f'
const WX_CLOUD_SERVICE = 'prod'

export function initCloudContainer() {
  // #ifdef MP-WEIXIN
  const cloud = getWeixinCloud()
  if (cloud?.init) {
    cloud.init({
      env: WX_CLOUD_ENV
    })
  }
  // #endif
}

export async function requestApi(path, options = {}) {
  const method = options.method || 'GET'

  // #ifdef MP-WEIXIN
  const cloud = getWeixinCloud()
  if (!cloud?.callContainer) {
    throw new Error('WeChat cloud container api unavailable')
  }

  return cloud.callContainer({
    config: {
      env: WX_CLOUD_ENV
    },
    path,
    header: {
      'X-WX-SERVICE': WX_CLOUD_SERVICE,
      'content-type': 'application/json',
      ...(options.header || {})
    },
    method,
    data: options.data ?? ''
  })
  // #endif

  // #ifndef MP-WEIXIN
  return uni.request({
    url: `${API_BASE}${path}`,
    method,
    data: options.data || undefined,
    header: {
      'content-type': 'application/json',
      ...(options.header || {})
    }
  })
  // #endif
}

function getWeixinCloud() {
  // #ifdef MP-WEIXIN
  return wx?.cloud
  // #endif

  // #ifndef MP-WEIXIN
  return null
  // #endif
}
