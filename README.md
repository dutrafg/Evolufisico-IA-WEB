# EvoluFísico Intelligence Web — RC2 (experimental)

Aplicativo **independente**. Repositório exclusivo: `dutrafg/Evolufisico-IA-WEB`.
Não altera nem acessa o `Evolufisico2` automaticamente.

## Abrir

- `index.html` ou `EFI_RC2_OFFLINE.html`: arquivo único, pode abrir diretamente no Windows/Android, sem servidor.
- `efi-intelligence/index.html`: versão modular para HTTPS ou localhost; PWA instalada pode trabalhar offline depois da primeira instalação completa do shell.
- `manifest.webmanifest`, `sw.js`: cache apenas de arquivos do aplicativo, **não** de dados de alunos ou modelos grandes.

## Novidades RC2

- Importar até 100 perfis por JSON local no contrato `efi.import.v1` (máx. 1 MB; 500 avaliações por aluno).
- Gerar exemplo do arquivo de importação.
- Inspecionar métricas, alertas, consistência de técnicas e exportar resultados JSON.
- Descartar os dados importados da memória da página.
- Gráficos com datas reais de avaliação e supressão em séries não comparáveis.
- Modo claro/escuro, visual responsivo, barra de status da conectividade.

### Privacidade

A importação **não** usa `fetch`, `IndexedDB`, cookies ou servidor. Os dados permanecem em memória até sair, recarregar ou descartar. Exports só ocorrem mediante clique. Evite importar informações pessoais em dispositivos compartilhados: conteúdo pode permanecer no navegador durante a sessão.

**Atenção:** exportar análise salva resultados em arquivo no dispositivo do profissional. A salvaguarda desse arquivo é responsabilidade do usuário.

## Testes

Requer Node.js 22+ e Python 3 para gerar o HTML único:

```bash
npm test
npm run build
```

Testes de navegador Android/Windows físicos são pendentes. O núcleo é **determinístico** e não constitui um LLM treinado; nunca deve ser usado para emitir diagnóstico.

## Limites e integração

O aplicativo aceita apenas o esquema EFI próprio; **não** importa automaticamente o banco interno de outro programa. A integração futura deve ser feita por um exportador específico, versionado e validado, quando autorizado.

O Gerenciador Offline ONNX RC1 está sendo desenvolvido separadamente e seus arquivos binários ainda não estão nesta branch. O serviço de cache desta versão não instala modelos de IA.