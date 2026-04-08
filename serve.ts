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

    // arXiv 代理 API — 绕过 CORS
    if (path === '/api/arxiv') {
      const id = url.searchParams.get('id')
      if (!id) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400 })
      try {
        const res = await fetch(`https://arxiv.org/abs/${id}`)
        const html = await res.text()
        // 提取 abstract
        const match = html.match(/<blockquote class="abstract[^"]*">\s*<span class="descriptor">[^<]*<\/span>\s*([\s\S]*?)<\/blockquote>/)
        const abstract = match ? match[1].replace(/<[^>]*>/g, '').trim() : ''
        // 提取标题
        const titleMatch = html.match(/<h1 class="title[^"]*">\s*<span class="descriptor">[^<]*<\/span>\s*([\s\S]*?)<\/h1>/)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : ''
        return new Response(JSON.stringify({ title, abstract }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
      }
    }

    // 处理 /@modules/ 路径 (bare module 导入映射)
    if (path.startsWith('/@modules/')) {
      const modulePath = path.replace('/@modules/', 'node_modules/')
      const file = Bun.file(modulePath)
      if (await file.exists()) {
        // 转译 TS 模块（如 pretext 源码）
        if (modulePath.endsWith('.ts')) {
          const transpiler = new Bun.Transpiler({ loader: 'ts' })
          const code = await file.text()
          let js = transpiler.transformSync(code)
          // pretext 内部 import 用 .js 后缀，但实际是 .ts
          js = js.replace(/from\s+["'](\.\/[^"']+)\.js["']/g, 'from "$1.ts"')
          return new Response(js, {
            headers: { 'Content-Type': 'application/javascript' },
          })
        }
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
