# Túnel — regressão no navegador

`pnpm test` executa os testes unitários em `tests/unit/tunnel/`. Esta suíte é separada: precisa de um navegador Chromium real/CDP e do servidor em execução.

## Preparação

Na raiz do repo:

```sh
pnpm install --frozen-lockfile
pnpm check && pnpm test && pnpm build
HOST=127.0.0.1 PORT=5182 ORIGIN=http://127.0.0.1:5182 pnpm start
```

No navegador integrado (`browser_exec`), abra uma aba nova e execute:

```python
from pathlib import Path
root = '/caminho/absoluto/do/repo'
out = '/caminho/absoluto/das/evidencias'
url = 'http://127.0.0.1:5182/tunnel'
new_tab(url)
wait_for_load()
exec(Path(root, 'tests/browser/tunnel-mobile.py').read_text())
run_tunnel_mobile(root, out, url, cdp=cdp, js=js,
                  goto_url=goto_url, wait_for_load=wait_for_load)
```

`AssertionError` significa FAIL. Os JSONs preservam as asserções de layout, amostras da viagem, interrupção e deslocamento nativo. Os testes de layout são injetados por CDP porque o allowlist padrão do SvelteKit não serve `tests/` no Vite; não amplie o acesso do servidor apenas para executar a suíte.

## Cobertura

- Viewports: 320×568, 390×844, 768×1024, 899×844, 900×844, 1440×900, 844×390 e 568×320.
- Seletor numérico abaixo de 900px e rótulos visíveis a partir de 900px; nomes acessíveis incluem número e destino.
- Alvos de toque ≥44×44px, espaço entre seletor/painéis, mínimo de seção de 150vh no compacto, overflow e cabeçalho.
- Toque real via `Input.dispatchTouchEvent`: viagem monotônica até Contato, chegada exata, `aria-current`, interrupção por toque e swipe nativo; eventos `isTrusted`.
- Erros de JS, promises não tratadas e `console.error` durante a navegação.

Inspecione screenshots separadamente para confirmar WebGL/renderização. Emulação Chromium não substitui teste em hardware iOS/Android nem auditoria de acessibilidade. Mantenha a aba em primeiro plano: abas ocultas suspendem rAF. Reinicie o servidor e recarregue a página após rebuild para não misturar SSR antigo e assets novos.
