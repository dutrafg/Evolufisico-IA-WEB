# EFI Web RC2 — Relatório de verificação

Data: 2026-10-24

## Escopo

Desenvolvimento isolado em `Evolufisico-IA-WEB`, partindo do núcleo RC1.1.
Nenhum arquivo do Evolufisico2 foi modificado.

## Verificações realizadas

- `npm test`: 38/38 verificações unitárias do motor + contrato de importação aprovadas.
- Campanhas internas: dois testes de 10.000 históricos sintéticos.
- `tools/build_standalone.py`: gera HTML autônomo e valida sintaxe JavaScript com Node.
- Importação rejeita schema não suportado, identidades cruzadas, datas/IDs duplicados, formatos inválidos e mais de 1 MB.
- Não há leitura de banco de alunos do EvoluFisico2 nem transmissão dos dados importados.

## Pendências

- Tentativas de navegação no Chromium automatizado foram bloqueadas neste ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR`) tanto por localhost quanto por `file://`.
- Não afirmar validação de PWA, Service Worker ou layouts em Android/Windows físicos.
- Gerenciador ONNX RC1 não publicado remotamente neste branch.
- Não há modelo de linguagem local nesta versão; os alertas são produzidos por métodos determinísticos.

## Critério de promoção

Homologar navegação, importação, renderização, modo offline, impressão e exportação em Windows Chrome/Firefox/Edge e Android Chrome. Apenas depois promover à main.