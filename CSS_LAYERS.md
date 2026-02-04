# Arquitetura de Camadas CSS (Inspector)

O Inspetor de CSS categoriza as regras encontradas em 4 camadas principais, permitindo identificar a origem e a prioridade de cada estilo.

## As 4 Camadas

| Camada | Ícone | Descrição | Origem Técnica | Edição |
| :--- | :--- | :--- | :--- | :--- |
| **Inline** | 🏷️ | Estilos no atributo `style` da tag HTML. | `element.style` | Sim |
| **Internal** | `style` | Estilos de arquivos locais (Vite/SFC). | `data-vite-dev-id` | **Convertido para <style>** |
| **On Page** | 📄 | Blocos `<style>` no `<head>` ou `App.vue`. | Tags `<style>` | Sim |
| **External** | 🔗 | Links externos (FontAwesome, CDNs). | Links `<link>` | **ReadOnly** |

---

## Comportamento no Inspetor

1. **Ordenação**: As camadas são exibidas por ordem de precedência (Inline no topo).
2. **Edição**: 
   - Camadas **Inline**, **Internal** e **On Page** são editáveis pelo Inspetor (sincronizadas com o AST).
   - Camada **External** é marcada como **somente leitura** (ReadOnly).
   - Ao carregar a página, o sistema captura o CSS de arquivos externos e internos. Durante a edição, os links originais são desabilitados e o conteúdo é "convertido" em blocos de estilo injetados (`#live-inspector-styles`).
3. **Persistência**: Alterações são salvas no AST global. Ao exportar o HTML, o editor pode substituir os `<link>` originais por tags `<style>` locais contendo as mudanças.
