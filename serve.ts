const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)
    let path = url.pathname

    if (path === '/' || path === '/index.html') {
      return new Response(Bun.file('index.html'), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // 处理 /@modules/ 路径 (bare module 导入映射)
    if (path.startsWith('/@modules/')) {
      const modulePath = path.replace('/@modules/', 'node_modules/')
      const file = Bun.file(modulePath)
      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': 'application/javascript' },
        })
      }
    }

    // 转译 TypeScript 文件
    if (path.endsWith('.ts')) {
      const file = Bun.file('.' + path)
      if (await file.exists()) {
        const transpiler = new Bun.Transpiler({ loader: 'ts' })
        const code = await file.text()
        let js = transpiler.transformSync(code)
        // 重写 @chenglou/pretext 导入为可解析的 URL
        js = js.replace(
          /from\s+["']@chenglou\/pretext["']/g,
          'from "/@modules/@chenglou/pretext/dist/layout.js"'
        )
        return new Response(js, {
          headers: { 'Content-Type': 'application/javascript' },
        })
      }
    }

    // 静态文件（.js, .css, 图片等）
    const staticExts = ['.js', '.css', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2']
    if (staticExts.some(ext => path.endsWith(ext))) {
      const file = Bun.file('.' + path)
      if (await file.exists()) {
        const contentType = path.endsWith('.js') ? 'application/javascript'
          : path.endsWith('.css') ? 'text/css'
          : 'application/octet-stream'
        return new Response(file, { headers: { 'Content-Type': contentType } })
      }
    }

    // node_modules 直接访问
    if (path.startsWith('/node_modules/')) {
      const file = Bun.file('.' + path)
      if (await file.exists()) {
        const contentType = path.endsWith('.js') ? 'application/javascript' : 'application/octet-stream'
        return new Response(file, { headers: { 'Content-Type': contentType } })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
})

console.log(`Angry Birds dev server running at http://localhost:${server.port}`)
