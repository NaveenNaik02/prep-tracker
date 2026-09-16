import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-http'

// Answer HTML already ships `<pre><code class="language-xxx">` from the
// markdown fenced code blocks — Prism's own convention — so highlighting
// existing DOM only needs the matching grammars registered above.
export function highlightIn(container: HTMLElement | null) {
  if (!container) return
  Prism.highlightAllUnder(container)
}
