# EvoluFísico Intelligence — IA Web

Projeto independente para inteligência analítica e execução offline em navegadores Android e Windows. **Não faz parte do repositório Evolufisico2**.

## Estado da publicação

Base de desenvolvimento RC1.1 (experimental). O aplicativo analítico de demonstração não contém dados reais e funciona em um HTML único. O Gerenciador Offline possui um pacote de distribuição integral separado, incluindo o runtime ONNX WebAssembly. Os arquivos binários de grande porte ainda não fazem parte desta publicação do GitHub.

## Abrir

- `index.html`: EFI Intelligence RC1.1, demonstração isolada com três alunos sintéticos; funciona aberto como arquivo local.
- `efi-intelligence/index.html`: versão modular para navegador em HTTP(S).
- `efi-intelligence/analyzer.mjs`: núcleo puro que valida históricos e gera indicadores e alertas descritivos.

## Testes

Execute `npm test` com Node.js 22 ou superior. O projeto não exige dependências NPM para testes de lógica. Android e Windows físicos requerem homologação adicional.

## Integração futura

A EFI poderá receber snapshots validados por um adaptador explícito. **Não importa dados automaticamente do Evolufisico2** e respeita bloqueios de auditoria daquele sistema. Nenhuma informação pessoal é transmitida para APIs externas pelo núcleo analítico.

## Limitações

O núcleo atual é determinístico; não é um modelo de linguagem próprio treinado. Ele não emite diagnósticos ou prescrições. Modelos ONNX de demonstração não têm validade clínica. `efi-offline/` estará disponível quando os arquivos do Gerenciador Offline forem publicados e validados nesta origem.

**Repositório:** https://github.com/dutrafg/Evolufisico-IA-WEB
