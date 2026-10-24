# EFI — contrato de integração

O motor `analyzeProfile` recebe um snapshot de aluno validado, com `profileId`, `assessments`, `goal` e datas padronizadas. A função `analyzeFromEFIA` pode adaptar a saída de EFIA, mas nunca acessa diretamente banco do Evolufisico2. Bloqueios do EFIA original têm precedência. Nenhuma rede é usada pelo núcleo determinístico.

Repositório dedicado independente. O Gerenciador Offline com ONNX está presente no ZIP de distribuição local; upload do runtime WebAssembly ao GitHub ainda pendente.
