using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TsukuyomiFocus.Domain.Http.Groq;
using TsukuyomiFocus.Domain.Http.Groq.Models;
using TsukuyomiFocus.Domain.Interfaces.Services;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Infrastructure.Http.Groq;

public sealed class GroqSharinganGeneratorService : ISharinganAiGeneratorService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly string[] ValidPassives =
    [
        "CHAKRA_MULTIPLIER",
        "AMATERASU_MASTERY",
        "IZANAGI_REGEN",
        "TIME_DILATION",
        "VISUAL_IMMUNITY"
    ];

    private static readonly string[] ValidJutsus =
    [
        "KAMUI_SKIP",
        "TSUKUYOMI_OVERDRIVE",
        "KOTOAMATSUKAMI_COMPLETE",
        "SHINRA_TENSEI_PURGE"
    ];

    private static readonly string[] ValidRarities =
    [
        "Rank A",
        "Rank S",
        "Rank SS - Divino"
    ];

    private const string SystemPrompt = """
        Você é a Forja Ocular Suprema e Motor de Visão Computacional do Clã Uchiha (Naruto).
        Crie Doujutsus canônicos fiéis ao anime (Mangekyou Sharingan ou Mangekyou Sharingan Eterno por fusão) E Poderes de Gameplay em JSON puro.

        Responda ESTRITAMENTE em JSON válido (SEM markdown ```json ou texto fora do JSON) com EXATAMENTE esta estrutura:
        {
          "doujutsuName": "Nome épico e inédito em Português (ex: Tsukuyomi Eterno de Madara e Itachi)",
          "loreDescription": "Descrição única e imersiva das habilidades combinadas do Olho Esquerdo e Direito em Português",
          "detectedMood": "Aura ou emoção em 2-4 palavras",
          "eyeCenterX": 0.5,
          "eyeCenterY": 0.5,
          "irisRadiusRatio": 0.22,
          "bladeCount": 3,
          "patternType": "eternal_fusion",
          "primaryLineage": "itachi",
          "secondaryLineage": "madara",
          "isEternalFusion": true,
          "centerShape": "circle",
          "bladeStyle": "curved_shuriken",
          "outerRingStyle": "tomoe_ring",
          "primaryCrimsonHex": "#DC2626",
          "secondaryDarkHex": "#450A0A",
          "hasAmaterasuFlames": false,
          "rotationOffset": 0,
          "ocularPowers": {
            "rarity": "Rank SS - Divino",
            "leftEyePassive": {
              "type": "CHAKRA_MULTIPLIER",
              "name": "Nome épico da passiva em Português",
              "description": "Descrição clara com o número exato do bônus no jogo.",
              "bonusValue": 1.35
            },
            "rightEyeActiveJutsu": {
              "type": "KAMUI_SKIP",
              "name": "Nome épico do Jutsu Ativo em Português",
              "description": "Descrição clara do efeito ativo ao clicar no Templo.",
              "cooldownCycles": 1
            },
            "visualThemeSignature": {
              "primaryGlowColor": "#DC2626",
              "secondaryColor": "#450A0A",
              "audioPitchRate": 0.94
            }
          }
        }

        REGRAS ESTRITAS:
        1. REGRA DE COR UCHIHA (OBRIGATÓRIA):
           - "primaryCrimsonHex" e "visualThemeSignature.primaryGlowColor" DEVEM SER SEMPRE "#DC2626" (Vermelho Carmesim clássico do Sharingan) e "secondaryDarkHex" DEVE SER "#450A0A", EXCETO se o pedido do usuário citar explicitamente o nome de outra cor (ex: "azul", "roxo", "dourado", "verde", "branco").
           - PROIBIDO inventar fundo amarelo, dourado ou cores aleatórias se o usuário não pediu outra cor!
        2. REGRA DE FUSÃO CANÔNICA (MANGEKYOU SHARINGAN ETERNO / EMS):
           - Quando o usuário pedir fusão ou combinação de dois Uchihas (ex: "fundir o do Madara com o do Itachi", "misturar Sasuke e Itachi"), defina:
             * "isEternalFusion": true
             * "patternType": "eternal_fusion"
             * "primaryLineage" e "secondaryLineage" com os nomes canônicos entre: "itachi", "madara", "sasuke", "obito", "shisui", "indra".
             * Para fusão Madara + Itachi, defina "primaryLineage": "itachi" e "secondaryLineage": "madara".
           - Para olho solo canônico, use "isEternalFusion": false e "primaryLineage" correspondente.
        3. GEOMETRIA SIMÉTRICA:
           - "centerShape" DEVE ser um destes: "circle", "square", "diamond", "triangle", "hexagram", "vortex". Para olhos canônicos/EMS, use "circle".
           - "bladeStyle" DEVE ser um destes: "curved_shuriken", "straight_katana", "square_geometric", "atomic_rings", "flame_serrated", "spiral_kamui".
           - "outerRingStyle" DEVE ser um destes: "tomoe_ring", "runic_seal", "double_rinne_ripple", "square_cage", "amaterasu_fire".
           - "bladeCount": inteiro de 2 a 12 (3 para Itachi/Madara/Obito, 4 para Shisui, 6 para Sasuke).
           - PROIBIDO gerar estrelas de 5 pontas assimétricas ou formatos de flor/girassol; mantenha simetria radial perfeita centrada em (256, 256).
        4. PODERES DE GAMEPLAY ("ocularPowers"):
           - "rarity": "Rank A", "Rank S" ou "Rank SS - Divino".
           - "leftEyePassive.type" DEVE ser UM destes:
             * "CHAKRA_MULTIPLIER" (bonusValue entre 1.15 e 1.50 — ex: +35% Chakra ao completar ciclo)
             * "AMATERASU_MASTERY" (bonusValue = 2 — permite marcar 2 missões com Amaterasu/dia e dobra bônus)
             * "IZANAGI_REGEN" (bonusValue = 90 — reduz restauração de olho cego de 180 para 90 min)
             * "TIME_DILATION" (bonusValue entre 1.20 e 1.40 — dilata minutos focados em progresso/stats)
             * "VISUAL_IMMUNITY" (bonusValue = 0 — imunidade total ao desgaste visual / blur)
           - "rightEyeActiveJutsu.type" DEVE ser UM destes:
             * "KAMUI_SKIP" (teleporta últimos 5 min do timer / conclui ciclo instantaneamente)
             * "TSUKUYOMI_OVERDRIVE" (relógio brilha e gera 2x Chakra no ciclo atual)
             * "KOTOAMATSUKAMI_COMPLETE" (avança +25m na missão ativa e restaura acuidade visual)
             * "SHINRA_TENSEI_PURGE" (zera desgaste visual imediatamente e concede +200 Chakra)
           - "rightEyeActiveJutsu.cooldownCycles": inteiro 1 ou 2.
           - "visualThemeSignature.audioPitchRate": número entre 0.78 e 1.22.
        5. Nunca repita o mesmo texto/poder: use o randomSeed fornecido para criar variações inéditas de lore, nome e habilidades mantendo 100% a fidelidade visual canônica!
        """;

    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;
    private readonly ILogger<GroqSharinganGeneratorService> _logger;

    public GroqSharinganGeneratorService(
        HttpClient httpClient,
        IOptions<GroqOptions> options,
        ILogger<GroqSharinganGeneratorService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<GeneratedSharinganResult> GenerateSharinganAsync(
        string? prompt,
        string? baseEyeImageBase64,
        string styleVariant,
        CancellationToken cancellationToken = default)
    {
        var normalizedVariant = string.IsNullOrWhiteSpace(styleVariant)
            ? LoreRules.MangekyouVariants.Itachi
            : styleVariant.Trim().ToLowerInvariant();

        var randomSeed = Guid.NewGuid().ToString("N")[..8];
        var seedHash = Math.Abs(randomSeed.GetHashCode(StringComparison.Ordinal));

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning(
                "GroqSettings:ApiKey não configurada. Aplicando síntese polimórfica dinâmica (Seed {Seed}) para variante {Variant}.",
                randomSeed,
                normalizedVariant);
            return BuildResultFromGroqResponse(null, prompt, normalizedVariant, randomSeed, seedHash);
        }

        var hasImage = !string.IsNullOrWhiteSpace(baseEyeImageBase64);
        GroqSharinganJsonModel? parsedJson = null;

        if (hasImage)
        {
            try
            {
                parsedJson = await TryInvokeGroqVisionAsync(
                    prompt,
                    NormalizeImageDataUriOrUrl(baseEyeImageBase64!),
                    normalizedVariant,
                    randomSeed,
                    cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(
                    ex,
                    "Falha na chamada Groq Vision (Seed {Seed}, Variant {Variant}). Executando fallback para modelo de texto.",
                    randomSeed,
                    normalizedVariant);
                parsedJson = null;
            }
        }

        if (parsedJson is null)
        {
            try
            {
                parsedJson = await TryInvokeGroqTextAsync(
                    prompt,
                    hasImage,
                    normalizedVariant,
                    randomSeed,
                    cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(
                    ex,
                    "Falha na chamada Groq Text (Seed {Seed}, Variant {Variant}). Aplicando motor polimórfico local.",
                    randomSeed,
                    normalizedVariant);
                parsedJson = null;
            }
        }

        return BuildResultFromGroqResponse(parsedJson, prompt, normalizedVariant, randomSeed, seedHash);
    }

    private async Task<GroqSharinganJsonModel?> TryInvokeGroqVisionAsync(
        string? prompt,
        string imageUrlOrDataUri,
        string styleVariant,
        string randomSeed,
        CancellationToken cancellationToken)
    {
        var userInstruction = BuildUserTextInstruction(prompt, styleVariant, randomSeed, hasReferenceImage: true);
        var visionPromptText = $"""
            {SystemPrompt}

            {userInstruction}

            IMPORTANTE: Retorne APENAS JSON puro e válido, sem blocos de código markdown (```json ou ```).
            """;

        var visionModel = string.IsNullOrWhiteSpace(_options.VisionModel)
            ? "qwen/qwen3.8-27b"
            : _options.VisionModel.Trim();

        var request = new GroqChatCompletionRequestModel
        {
            Model = visionModel,
            Temperature = 0.85,
            MaxTokens = 3072,
            ResponseFormat = null,
            Messages =
            [
                new GroqMessageModel
                {
                    Role = "user",
                    Content = new List<GroqContentPartModel>
                    {
                        new()
                        {
                            Type = "text",
                            Text = visionPromptText
                        },
                        new()
                        {
                            Type = "image_url",
                            ImageUrl = new GroqImageUrlModel { Url = imageUrlOrDataUri }
                        }
                    }
                }
            ]
        };

        return await SendChatCompletionAsync(request, "Vision", randomSeed, cancellationToken);
    }

    private async Task<GroqSharinganJsonModel?> TryInvokeGroqTextAsync(
        string? prompt,
        bool cameFromVisionFallback,
        string styleVariant,
        string randomSeed,
        CancellationToken cancellationToken)
    {
        var userInstruction = BuildUserTextInstruction(prompt, styleVariant, randomSeed, hasReferenceImage: cameFromVisionFallback);
        var primaryTextModel = string.IsNullOrWhiteSpace(_options.TextModel)
            ? "openai/gpt-oss-120b"
            : _options.TextModel.Trim();

        string[] candidateModels = new[]
        {
            primaryTextModel,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        }
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

        foreach (var candidateModel in candidateModels)
        {
            var request = new GroqChatCompletionRequestModel
            {
                Model = candidateModel,
                Temperature = 0.85,
                MaxTokens = 3072,
                ResponseFormat = new GroqResponseFormatModel { Type = "json_object" },
                Messages =
                [
                    new GroqMessageModel
                    {
                        Role = "system",
                        Content = SystemPrompt
                    },
                    new GroqMessageModel
                    {
                        Role = "user",
                        Content = userInstruction
                    }
                ]
            };

            var parsed = await SendChatCompletionAsync(request, "Text", randomSeed, cancellationToken);
            if (parsed is not null)
            {
                return parsed;
            }
        }

        return null;
    }

    private async Task<GroqSharinganJsonModel?> SendChatCompletionAsync(
        GroqChatCompletionRequestModel request,
        string modeLabel,
        string randomSeed,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation(
                "Invocando Groq API ({Mode} / {Model}) para Forja Ocular [Seed={Seed}, Temp={Temp}]...",
                modeLabel,
                request.Model,
                randomSeed,
                request.Temperature);

            using var response = await _httpClient.PostAsJsonAsync(
                _options.BaseUrl,
                request,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Groq API ({Mode} / {Model}) falhou com HTTP {StatusCode}: {Body}",
                    modeLabel,
                    request.Model,
                    (int)response.StatusCode,
                    errorBody);
                return null;
            }

            var completion = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponseModel>(
                JsonOptions,
                cancellationToken);

            var rawContent = completion?.Choices.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(rawContent))
            {
                _logger.LogWarning("Groq API ({Mode}) retornou conteúdo vazio [Seed={Seed}].", modeLabel, randomSeed);
                return null;
            }

            _logger.LogInformation(
                "Groq API ({Mode}) respondeu com sucesso ({Length} chars) [Seed={Seed}].",
                modeLabel,
                rawContent.Length,
                randomSeed);

            return ParseGroqJsonOrExtractFields(rawContent, modeLabel);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Exceção ao chamar/processar Groq API ({Mode} / {Model}, Url={Url}) [Seed={Seed}].",
                modeLabel,
                request.Model,
                _options.BaseUrl,
                randomSeed);
            return null;
        }
    }

    private GroqSharinganJsonModel? ParseGroqJsonOrExtractFields(string rawContent, string modeLabel)
    {
        var cleaned = StripMarkdownFences(rawContent);
        var jsonContent = ExtractJsonObject(cleaned);

        try
        {
            var parsed = JsonSerializer.Deserialize<GroqSharinganJsonModel>(jsonContent, JsonOptions);
            if (parsed is not null)
            {
                return parsed;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(
                ex,
                "Resposta do Groq ({Mode}) trouxe JSON malformado; recuperando parâmetros oculares via Regex.",
                modeLabel);
        }

        var recoveredSvg = TryExtractSvgElement(cleaned);
        var doujutsuName = TryExtractJsonStringField(cleaned, "doujutsuName");
        var loreDescription = TryExtractJsonStringField(cleaned, "loreDescription");
        var detectedMood = TryExtractJsonStringField(cleaned, "detectedMood");
        var patternType = TryExtractJsonStringField(cleaned, "patternType");
        var primaryLineage = TryExtractJsonStringField(cleaned, "primaryLineage");
        var secondaryLineage = TryExtractJsonStringField(cleaned, "secondaryLineage");
        var isEternalFusion = TryExtractJsonBoolField(cleaned, "isEternalFusion");
        var centerShape = TryExtractJsonStringField(cleaned, "centerShape");
        var bladeStyle = TryExtractJsonStringField(cleaned, "bladeStyle");
        var outerRingStyle = TryExtractJsonStringField(cleaned, "outerRingStyle");
        var primaryCrimsonHex = TryExtractJsonStringField(cleaned, "primaryCrimsonHex")
            ?? TryExtractJsonStringField(cleaned, "primaryGlowColor");
        var secondaryDarkHex = TryExtractJsonStringField(cleaned, "secondaryDarkHex");
        var eyeCenterX = TryExtractJsonDoubleField(cleaned, "eyeCenterX");
        var eyeCenterY = TryExtractJsonDoubleField(cleaned, "eyeCenterY");
        var irisRadiusRatio = TryExtractJsonDoubleField(cleaned, "irisRadiusRatio");
        var bladeCount = TryExtractJsonIntField(cleaned, "bladeCount");
        var rotationOffset = TryExtractJsonDoubleField(cleaned, "rotationOffset");
        var hasAmaterasuFlames = TryExtractJsonBoolField(cleaned, "hasAmaterasuFlames");

        if (doujutsuName is null &&
            loreDescription is null &&
            patternType is null &&
            primaryLineage is null &&
            centerShape is null &&
            eyeCenterX is null &&
            recoveredSvg is null)
        {
            return null;
        }

        return new GroqSharinganJsonModel
        {
            DoujutsuName = doujutsuName,
            LoreDescription = loreDescription,
            DetectedMood = detectedMood,
            EyeCenterX = eyeCenterX,
            EyeCenterY = eyeCenterY,
            IrisRadiusRatio = irisRadiusRatio,
            BladeCount = bladeCount,
            PatternType = patternType,
            PrimaryLineage = primaryLineage,
            SecondaryLineage = secondaryLineage,
            IsEternalFusion = isEternalFusion,
            CenterShape = centerShape,
            BladeStyle = bladeStyle,
            OuterRingStyle = outerRingStyle,
            PrimaryCrimsonHex = primaryCrimsonHex,
            PrimaryGlowColor = primaryCrimsonHex,
            SecondaryDarkHex = secondaryDarkHex,
            HasAmaterasuFlames = hasAmaterasuFlames,
            RotationOffset = rotationOffset,
            SvgCode = recoveredSvg
        };
    }

    private static GeneratedSharinganResult BuildResultFromGroqResponse(
        GroqSharinganJsonModel? groqJson,
        string? userPrompt,
        string styleVariant,
        string randomSeed,
        int seedHash)
    {
        var normalizedPrompt = RemoveDiacritics(userPrompt ?? string.Empty).ToLowerInvariant();
        var intent = AnalyzePromptIntent(normalizedPrompt);

        var isCustomTab = string.Equals(styleVariant, "custom", StringComparison.OrdinalIgnoreCase);
        var singleCanonicalLineageRequested = intent.DetectedLineages.Count == 1 && !intent.HasFusionIntent;
        var hasExplicitFusion = intent.DetectedLineages.Count >= 2 ||
                                intent.HasFusionIntent ||
                                (!singleCanonicalLineageRequested &&
                                 (groqJson?.IsEternalFusion == true ||
                                  !string.IsNullOrWhiteSpace(groqJson?.SecondaryLineage)));

        var isPureGeometryCustomPrompt = isCustomTab &&
                                         intent.RequiresPolymorphicCustom &&
                                         !intent.HasFusionIntent &&
                                         intent.DetectedLineages.Count == 0;

        var isEternalFusion = !isPureGeometryCustomPrompt &&
                              !singleCanonicalLineageRequested &&
                              (hasExplicitFusion || isCustomTab);

        string resolvedPrimaryLineage;
        string? resolvedSecondaryLineage = null;

        if (isEternalFusion)
        {
            var firstCandidate = intent.DetectedLineages.Count >= 1
                ? intent.DetectedLineages[0]
                : (!string.IsNullOrWhiteSpace(groqJson?.PrimaryLineage)
                    ? groqJson.PrimaryLineage
                    : (!isCustomTab ? styleVariant : SharinganCanonicalLayers.Lineages.Itachi));

            var secondCandidate = intent.DetectedLineages.Count >= 2
                ? intent.DetectedLineages[1]
                : (!string.IsNullOrWhiteSpace(groqJson?.SecondaryLineage)
                    ? groqJson.SecondaryLineage
                    : (!isCustomTab && !string.Equals(
                            SharinganCanonicalLayers.NormalizeLineage(firstCandidate),
                            SharinganCanonicalLayers.NormalizeLineage(styleVariant),
                            StringComparison.Ordinal)
                        ? styleVariant
                        : PickComplementaryFusionLineage(firstCandidate, seedHash)));

            var (underlay, overlay) = AnimeAccurateSharinganSvgBuilder.ResolveFusionLayerOrder(
                firstCandidate,
                secondCandidate);

            resolvedSecondaryLineage = underlay;
            resolvedPrimaryLineage = overlay;
        }
        else
        {
            var singleCandidate = intent.DetectedLineages.Count >= 1
                ? intent.DetectedLineages[0]
                : (!string.IsNullOrWhiteSpace(groqJson?.PrimaryLineage)
                    ? groqJson.PrimaryLineage
                    : (!isCustomTab ? styleVariant : SharinganCanonicalLayers.Lineages.Itachi));
            resolvedPrimaryLineage = SharinganCanonicalLayers.NormalizeLineage(singleCandidate);
        }

        var patternType = isEternalFusion
            ? AnimeAccurateSharinganSvgBuilder.PatternTypes.EternalFusion
            : isPureGeometryCustomPrompt
                ? AnimeAccurateSharinganSvgBuilder.PatternTypes.IndraSpiral
                : AnimeAccurateSharinganSvgBuilder.NormalizePatternType(
                    resolvedPrimaryLineage,
                    styleVariant);

        var resolvedCenterShape = isEternalFusion && !intent.RequiresPolymorphicCustom
            ? AnimeAccurateSharinganSvgBuilder.CenterShapes.Circle
            : AnimeAccurateSharinganSvgBuilder.NormalizeCenterShape(
                intent.CenterShape ?? (isCustomTab && isPureGeometryCustomPrompt ? groqJson?.CenterShape : AnimeAccurateSharinganSvgBuilder.CenterShapes.Circle));

        var resolvedBladeStyle = isEternalFusion && !intent.RequiresPolymorphicCustom
            ? AnimeAccurateSharinganSvgBuilder.BladeStyles.CurvedShuriken
            : AnimeAccurateSharinganSvgBuilder.NormalizeBladeStyle(
                intent.BladeStyle ?? (isPureGeometryCustomPrompt ? groqJson?.BladeStyle : null),
                patternType);

        var hasAmaterasuFlames = intent.HasAmaterasuFlames || (groqJson?.HasAmaterasuFlames == true);

        var resolvedOuterRingStyle = isEternalFusion && !intent.RequiresPolymorphicCustom
            ? (hasAmaterasuFlames
                ? AnimeAccurateSharinganSvgBuilder.OuterRingStyles.AmaterasuFire
                : AnimeAccurateSharinganSvgBuilder.OuterRingStyles.TomoeRing)
            : AnimeAccurateSharinganSvgBuilder.NormalizeOuterRingStyle(
                intent.OuterRingStyle ?? (isPureGeometryCustomPrompt ? groqJson?.OuterRingStyle : null),
                hasAmaterasuFlames);

        var defaultBlades = isEternalFusion
            ? (resolvedPrimaryLineage == SharinganCanonicalLayers.Lineages.Sasuke ||
               resolvedSecondaryLineage == SharinganCanonicalLayers.Lineages.Sasuke
                ? 6
                : 3)
            : AnimeAccurateSharinganSvgBuilder.GetDefaultBladeCount(patternType);
        var bladeCount = Math.Clamp(intent.BladeCount ?? defaultBlades, 2, 12);

        // Strict Uchiha palette enforcement: ALWAYS Crimson (#DC2626) unless user explicitly names another color
        var primaryCrimson = SharinganSvgHelper.NormalizeHexColor(intent.PrimaryHex ?? PickVariantFallbackColor(styleVariant, seedHash));
        var secondaryDark = SharinganSvgHelper.NormalizeHexColor(intent.SecondaryHex, "#450A0A");
        var explicitColorRequested = intent.PrimaryHex is not null;

        var rotationOffset = isEternalFusion || resolvedCenterShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Circle
            ? 0.0
            : Math.Round((((groqJson?.RotationOffset ?? ((seedHash % 4) * 15.0)) % 360) + 360) % 360, 2);

        var eyeCenterX = Math.Round(Math.Clamp(groqJson?.EyeCenterX ?? 0.5, 0.05, 0.95), 4);
        var eyeCenterY = Math.Round(Math.Clamp(groqJson?.EyeCenterY ?? 0.5, 0.05, 0.95), 4);
        var irisRadiusRatio = Math.Round(Math.Clamp(groqJson?.IrisRadiusRatio ?? 0.22, 0.05, 0.50), 4);

        var doujutsuName = string.IsNullOrWhiteSpace(groqJson?.DoujutsuName)
            ? BuildDynamicFallbackName(
                styleVariant,
                resolvedPrimaryLineage,
                resolvedSecondaryLineage,
                isEternalFusion,
                resolvedCenterShape,
                resolvedBladeStyle,
                seedHash)
            : groqJson.DoujutsuName.Trim();

        var loreDescription = string.IsNullOrWhiteSpace(groqJson?.LoreDescription)
            ? BuildDynamicFallbackLore(
                styleVariant,
                resolvedPrimaryLineage,
                resolvedSecondaryLineage,
                isEternalFusion,
                userPrompt,
                resolvedCenterShape,
                seedHash)
            : groqJson.LoreDescription.Trim();

        var detectedMood = string.IsNullOrWhiteSpace(groqJson?.DetectedMood)
            ? BuildDynamicFallbackMood(styleVariant, isEternalFusion, hasAmaterasuFlames, seedHash)
            : groqJson.DetectedMood.Trim();

        var ocularPowers = BuildNormalizedOcularPowers(
            groqJson?.OcularPowers,
            primaryCrimson,
            secondaryDark,
            explicitColorRequested,
            hasAmaterasuFlames,
            seedHash,
            doujutsuName);

        var builtSvg = AnimeAccurateSharinganSvgBuilder.Build(new SharinganVisualParameters
        {
            PatternType = patternType,
            PrimaryLineage = resolvedPrimaryLineage,
            SecondaryLineage = resolvedSecondaryLineage,
            IsEternalFusion = isEternalFusion,
            CenterShape = resolvedCenterShape,
            BladeStyle = resolvedBladeStyle,
            OuterRingStyle = resolvedOuterRingStyle,
            BladeCount = bladeCount,
            PrimaryCrimsonHex = primaryCrimson,
            SecondaryDarkHex = secondaryDark,
            HasAmaterasuFlames = hasAmaterasuFlames,
            RotationOffset = rotationOffset,
            CustomSvgOverlay = null,
            UniqueId = randomSeed,
            UsePolymorphicBlades = isPureGeometryCustomPrompt || intent.BladeCount.HasValue
        });

        var rawSvg = SharinganSvgHelper.TryValidateAndSanitize(builtSvg, out var sanitizedSvg)
            ? sanitizedSvg
            : builtSvg;

        var svgDataUri = SharinganSvgHelper.ToSvgDataUri(rawSvg);

        return new GeneratedSharinganResult
        {
            DoujutsuName = doujutsuName,
            LoreDescription = loreDescription,
            DetectedMood = detectedMood,
            EyeCenterX = eyeCenterX,
            EyeCenterY = eyeCenterY,
            IrisRadiusRatio = irisRadiusRatio,
            BladeCount = bladeCount,
            PatternType = patternType,
            PrimaryLineage = resolvedPrimaryLineage,
            SecondaryLineage = resolvedSecondaryLineage,
            IsEternalFusion = isEternalFusion,
            CenterShape = resolvedCenterShape,
            BladeStyle = resolvedBladeStyle,
            OuterRingStyle = resolvedOuterRingStyle,
            CustomSvgOverlay = null,
            PrimaryCrimsonHex = primaryCrimson,
            SecondaryDarkHex = secondaryDark,
            HasAmaterasuFlames = hasAmaterasuFlames,
            RotationOffset = rotationOffset,
            RawSvgCode = rawSvg,
            SvgDataUri = svgDataUri,
            RasterImageUrl = svgDataUri,
            PrimaryGlowColor = ocularPowers.VisualThemeSignature.PrimaryGlowColor,
            OcularPowers = ocularPowers
        };
    }

    private static OcularPowersValueObject BuildNormalizedOcularPowers(
        GroqOcularPowersJsonModel? rawPowers,
        string primaryColor,
        string secondaryColor,
        bool explicitColorRequested,
        bool hasAmaterasuFlames,
        int seedHash,
        string doujutsuName)
    {
        var rarity = NormalizeRarity(rawPowers?.Rarity, seedHash);

        var rawPassiveType = rawPowers?.LeftEyePassive?.Type?.Trim().ToUpperInvariant();
        var passiveType = ValidPassives.Contains(rawPassiveType, StringComparer.Ordinal)
            ? rawPassiveType!
            : hasAmaterasuFlames
                ? "AMATERASU_MASTERY"
                : ValidPassives[seedHash % ValidPassives.Length];

        var defaultPassive = GetDefaultPassive(passiveType, seedHash);
        var passiveBonus = rawPowers?.LeftEyePassive?.BonusValue is > 0
            ? rawPowers.LeftEyePassive.BonusValue.Value
            : defaultPassive.BonusValue;

        if (passiveType == "CHAKRA_MULTIPLIER")
        {
            passiveBonus = Math.Round(Math.Clamp(passiveBonus, 1.15, 1.50), 2);
        }
        else if (passiveType == "TIME_DILATION")
        {
            passiveBonus = Math.Round(Math.Clamp(passiveBonus, 1.15, 1.40), 2);
        }
        else if (passiveType == "AMATERASU_MASTERY")
        {
            passiveBonus = 2;
        }
        else if (passiveType == "IZANAGI_REGEN")
        {
            passiveBonus = 90;
        }
        else if (passiveType == "VISUAL_IMMUNITY")
        {
            passiveBonus = 0;
        }

        var leftEyePassive = new LeftEyePassiveValueObject
        {
            Type = passiveType,
            Name = string.IsNullOrWhiteSpace(rawPowers?.LeftEyePassive?.Name)
                ? defaultPassive.Name
                : rawPowers.LeftEyePassive.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(rawPowers?.LeftEyePassive?.Description)
                ? defaultPassive.Description
                : rawPowers.LeftEyePassive.Description.Trim(),
            BonusValue = passiveBonus
        };

        var rawJutsuType = rawPowers?.RightEyeActiveJutsu?.Type?.Trim().ToUpperInvariant();
        var jutsuType = ValidJutsus.Contains(rawJutsuType, StringComparer.Ordinal)
            ? rawJutsuType!
            : ValidJutsus[(seedHash / 3) % ValidJutsus.Length];

        var defaultJutsu = GetDefaultJutsu(jutsuType, doujutsuName);
        var cooldown = Math.Clamp(rawPowers?.RightEyeActiveJutsu?.CooldownCycles ?? 1, 1, 2);

        var rightEyeActiveJutsu = new RightEyeActiveJutsuValueObject
        {
            Type = jutsuType,
            Name = string.IsNullOrWhiteSpace(rawPowers?.RightEyeActiveJutsu?.Name)
                ? defaultJutsu.Name
                : rawPowers.RightEyeActiveJutsu.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(rawPowers?.RightEyeActiveJutsu?.Description)
                ? defaultJutsu.Description
                : rawPowers.RightEyeActiveJutsu.Description.Trim(),
            CooldownCycles = cooldown
        };

        var glowColor = explicitColorRequested
            ? SharinganSvgHelper.NormalizeHexColor(rawPowers?.VisualThemeSignature?.PrimaryGlowColor, primaryColor)
            : "#DC2626";
        var themeSecondary = explicitColorRequested
            ? SharinganSvgHelper.NormalizeHexColor(rawPowers?.VisualThemeSignature?.SecondaryColor, secondaryColor)
            : "#450A0A";
        var pitchRate = Math.Round(
            Math.Clamp(
                rawPowers?.VisualThemeSignature?.AudioPitchRate ?? (0.86 + ((seedHash % 7) * 0.05)),
                0.75,
                1.25),
            2);

        return new OcularPowersValueObject
        {
            Rarity = rarity,
            LeftEyePassive = leftEyePassive,
            RightEyeActiveJutsu = rightEyeActiveJutsu,
            VisualThemeSignature = new VisualThemeSignatureValueObject
            {
                PrimaryGlowColor = glowColor,
                SecondaryColor = themeSecondary,
                AudioPitchRate = pitchRate
            }
        };
    }

    private static string NormalizeRarity(string? rawRarity, int seedHash)
    {
        if (!string.IsNullOrWhiteSpace(rawRarity))
        {
            var matched = ValidRarities.FirstOrDefault(r =>
                r.Equals(rawRarity.Trim(), StringComparison.OrdinalIgnoreCase));
            if (matched is not null)
            {
                return matched;
            }

            if (rawRarity.Contains("SS", StringComparison.OrdinalIgnoreCase))
            {
                return "Rank SS - Divino";
            }

            if (rawRarity.Contains("S", StringComparison.OrdinalIgnoreCase))
            {
                return "Rank S";
            }
        }

        return (seedHash % 10) switch
        {
            >= 7 => "Rank SS - Divino",
            >= 3 => "Rank S",
            _ => "Rank A"
        };
    }

    private static LeftEyePassiveValueObject GetDefaultPassive(string type, int seedHash) => type switch
    {
        "AMATERASU_MASTERY" => new LeftEyePassiveValueObject
        {
            Type = "AMATERASU_MASTERY",
            Name = "Domínio das Chamas Eternas",
            Description = "Permite marcar até 2 missões com Amaterasu por dia no Pergaminho e dobra o bônus de fogo negro.",
            BonusValue = 2
        },
        "IZANAGI_REGEN" => new LeftEyePassiveValueObject
        {
            Type = "IZANAGI_REGEN",
            Name = "Reescrita Celular de Izanagi",
            Description = "Reduz pela metade (180m para 90m) o tempo de restauração de olhos cegos e protege Chakra ao pausar.",
            BonusValue = 90
        },
        "TIME_DILATION" => new LeftEyePassiveValueObject
        {
            Type = "TIME_DILATION",
            Name = "Dilatação Temporal do Tsukuyomi",
            Description = "Comprime o tempo espiritual: cada 25 minutos focados contam como 32 minutos de progresso nas missões.",
            BonusValue = 1.28
        },
        "VISUAL_IMMUNITY" => new LeftEyePassiveValueObject
        {
            Type = "VISUAL_IMMUNITY",
            Name = "Luz Eterna (Imunidade Ocular)",
            Description = "Bloqueia permanentemente a perda de Acuidade Visual (Visual Blur travado em 0%).",
            BonusValue = 0
        },
        _ => new LeftEyePassiveValueObject
        {
            Type = "CHAKRA_MULTIPLIER",
            Name = "Sifão Carmesim de Chakra",
            Description = $"Amplifica o ganho total de Chakra em +{15 + (seedHash % 4) * 10}% ao concluir qualquer ciclo de foco.",
            BonusValue = 1.15 + ((seedHash % 4) * 0.10)
        }
    };

    private static RightEyeActiveJutsuValueObject GetDefaultJutsu(string type, string doujutsuName) => type switch
    {
        "KAMUI_SKIP" => new RightEyeActiveJutsuValueObject
        {
            Type = "KAMUI_SKIP",
            Name = "Distorção Kamui Temporal",
            Description = $"Teleporta os últimos 5 minutos do cronômetro ({doujutsuName}), concluindo ou acelerando o ciclo com 100% de Chakra.",
            CooldownCycles = 1
        },
        "KOTOAMATSUKAMI_COMPLETE" => new RightEyeActiveJutsuValueObject
        {
            Type = "KOTOAMATSUKAMI_COMPLETE",
            Name = "Decreto de Kotoamatsukami",
            Description = "Imprime +25 minutos instantâneos na missão ativa do Kanban e restaura +1 nível de Acuidade Visual.",
            CooldownCycles = 2
        },
        "SHINRA_TENSEI_PURGE" => new RightEyeActiveJutsuValueObject
        {
            Type = "SHINRA_TENSEI_PURGE",
            Name = "Expurgo Shinra Tensei",
            Description = "Dissipa imediatamente todo Desgaste Visual (0% Blur) e canaliza uma explosão de +200 Chakra.",
            CooldownCycles = 1
        },
        _ => new RightEyeActiveJutsuValueObject
        {
            Type = "TSUKUYOMI_OVERDRIVE",
            Name = "Sobrecarga do Tsukuyomi Infinito",
            Description = "Faz o Ocular Clock pulsar em poder máximo e garante 2x Chakra dobrado ao finalizar este ciclo.",
            CooldownCycles = 1
        }
    };

    private static string BuildUserTextInstruction(
        string? prompt,
        string styleVariant,
        string randomSeed,
        bool hasReferenceImage)
    {
        var userPromptText = string.IsNullOrWhiteSpace(prompt)
            ? $"Forje um Mangekyou Sharingan inédito e geometricamente marcante no estilo '{styleVariant}'."
            : prompt.Trim();

        var referenceDirective = hasReferenceImage
            ? "ANÁLISE DE FOTO ATIVA: Localize a pupila mais nítida e retorne eyeCenterX (0.0 a 1.0), eyeCenterY (0.0 a 1.0), irisRadiusRatio (0.05 a 0.50), detectedMood e loreDescription baseada no olhar."
            : "Sem foto enviada: defina eyeCenterX = 0.5, eyeCenterY = 0.5 e irisRadiusRatio = 0.22.";

        return $"""
            Semente de unicidade (randomSeed): {randomSeed}
            Timestamp UTC: {DateTimeOffset.UtcNow:O}
            Linhagem base solicitada: {styleVariant}
            Pedido exato do usuário: "{userPromptText}"
            {referenceDirective}

            IMPORTANTE:
            - Mantenha a paleta clássica Vermelho Carmesim (#DC2626) + Preto (#050505), EXCETO se o pedido do usuário citar explicitamente outra cor (ex: dourado, roxo, azul, verde).
            - Se o pedido envolver fusão de dois Uchihas (ex: Madara + Itachi), defina isEternalFusion=true, patternType='eternal_fusion', primaryLineage e secondaryLineage corretos.
            - Crie poderes RPG balanceados e inéditos. Retorne APENAS JSON puro.
            """;
    }

    private sealed record PromptIntent(
        IReadOnlyList<string> DetectedLineages,
        bool HasFusionIntent,
        string? CenterShape,
        string? BladeStyle,
        string? OuterRingStyle,
        int? BladeCount,
        string? PrimaryHex,
        string? SecondaryHex,
        bool HasAmaterasuFlames,
        bool RequiresPolymorphicCustom);

    private static PromptIntent AnalyzePromptIntent(string normalizedPrompt)
    {
        var detectedLineages = ExtractMentionedLineages(normalizedPrompt);
        var hasFusionIntent = detectedLineages.Count >= 2 ||
                              normalizedPrompt.Contains("fund", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains("fusa", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains("etern", StringComparison.Ordinal) ||
                              Regex.IsMatch(normalizedPrompt, @"\bems\b", RegexOptions.CultureInvariant) ||
                              normalizedPrompt.Contains("combin", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains("mistur", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains("junt", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains("com o ", StringComparison.Ordinal) ||
                              normalizedPrompt.Contains(" + ", StringComparison.Ordinal);

        string? centerShape = null;
        string? bladeStyle = null;
        string? outerRingStyle = null;
        var polymorphic = false;

        if (normalizedPrompt.Contains("quadrad", StringComparison.Ordinal) ||
            normalizedPrompt.Contains("square", StringComparison.Ordinal) ||
            normalizedPrompt.Contains("cubo", StringComparison.Ordinal) ||
            normalizedPrompt.Contains("retangul", StringComparison.Ordinal))
        {
            centerShape = AnimeAccurateSharinganSvgBuilder.CenterShapes.Square;
            bladeStyle = AnimeAccurateSharinganSvgBuilder.BladeStyles.SquareGeometric;
            outerRingStyle = AnimeAccurateSharinganSvgBuilder.OuterRingStyles.SquareCage;
            polymorphic = true;
        }
        else if (normalizedPrompt.Contains("estrel", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("star", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("hexagram", StringComparison.Ordinal))
        {
            centerShape = AnimeAccurateSharinganSvgBuilder.CenterShapes.Hexagram;
            bladeStyle = AnimeAccurateSharinganSvgBuilder.BladeStyles.AtomicRings;
            polymorphic = true;
        }
        else if (normalizedPrompt.Contains("diamant", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("losang", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("diamond", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("cristal", StringComparison.Ordinal))
        {
            centerShape = AnimeAccurateSharinganSvgBuilder.CenterShapes.Diamond;
            bladeStyle = AnimeAccurateSharinganSvgBuilder.BladeStyles.StraightKatana;
            polymorphic = true;
        }
        else if (normalizedPrompt.Contains("triangul", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("piramid", StringComparison.Ordinal))
        {
            centerShape = AnimeAccurateSharinganSvgBuilder.CenterShapes.Triangle;
            bladeStyle = AnimeAccurateSharinganSvgBuilder.BladeStyles.StraightKatana;
            polymorphic = true;
        }
        else if (normalizedPrompt.Contains("espiral", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("vortic", StringComparison.Ordinal))
        {
            centerShape = AnimeAccurateSharinganSvgBuilder.CenterShapes.Vortex;
            bladeStyle = AnimeAccurateSharinganSvgBuilder.BladeStyles.SpiralKamui;
            polymorphic = true;
        }

        if (normalizedPrompt.Contains("katana", StringComparison.Ordinal))
        {
            bladeStyle ??= AnimeAccurateSharinganSvgBuilder.BladeStyles.StraightKatana;
            polymorphic = true;
        }

        if (normalizedPrompt.Contains("selo", StringComparison.Ordinal) ||
            normalizedPrompt.Contains("runa", StringComparison.Ordinal))
        {
            outerRingStyle ??= AnimeAccurateSharinganSvgBuilder.OuterRingStyles.RunicSeal;
            polymorphic = true;
        }
        else if (normalizedPrompt.Contains("rinnegan", StringComparison.Ordinal) ||
                 normalizedPrompt.Contains("onda", StringComparison.Ordinal))
        {
            outerRingStyle ??= AnimeAccurateSharinganSvgBuilder.OuterRingStyles.DoubleRinneRipple;
            polymorphic = true;
        }

        var hasAmaterasu = normalizedPrompt.Contains("amaterasu", StringComparison.Ordinal) ||
                           normalizedPrompt.Contains("chama", StringComparison.Ordinal) ||
                           normalizedPrompt.Contains("fogo", StringComparison.Ordinal);

        if (hasAmaterasu && outerRingStyle is null)
        {
            outerRingStyle = AnimeAccurateSharinganSvgBuilder.OuterRingStyles.AmaterasuFire;
        }

        var (primaryHex, secondaryHex) = ExtractColorPairHint(normalizedPrompt);

        return new PromptIntent(
            DetectedLineages: detectedLineages,
            HasFusionIntent: hasFusionIntent,
            CenterShape: centerShape,
            BladeStyle: bladeStyle,
            OuterRingStyle: outerRingStyle,
            BladeCount: ExtractBladeCountHint(normalizedPrompt),
            PrimaryHex: primaryHex,
            SecondaryHex: secondaryHex,
            HasAmaterasuFlames: hasAmaterasu,
            RequiresPolymorphicCustom: polymorphic);
    }

    private static IReadOnlyList<string> ExtractMentionedLineages(string normalizedPrompt)
    {
        if (string.IsNullOrWhiteSpace(normalizedPrompt))
        {
            return [];
        }

        (string Keyword, string Lineage)[] mappings =
        [
            ("madara", SharinganCanonicalLayers.Lineages.Madara),
            ("itachi", SharinganCanonicalLayers.Lineages.Itachi),
            ("sasuke", SharinganCanonicalLayers.Lineages.Sasuke),
            ("obito", SharinganCanonicalLayers.Lineages.Obito),
            ("kakashi", SharinganCanonicalLayers.Lineages.Obito),
            ("shisui", SharinganCanonicalLayers.Lineages.Shisui),
            ("indra", SharinganCanonicalLayers.Lineages.Indra)
        ];

        var matches = new List<(int Index, string Lineage)>();
        foreach (var (keyword, lineage) in mappings)
        {
            var idx = normalizedPrompt.IndexOf(keyword, StringComparison.Ordinal);
            if (idx >= 0)
            {
                matches.Add((idx, lineage));
            }
        }

        return matches
            .OrderBy(m => m.Index)
            .Select(m => m.Lineage)
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private static string PickComplementaryFusionLineage(string primaryLineage, int seedHash)
    {
        var normalized = SharinganCanonicalLayers.NormalizeLineage(primaryLineage);
        string[] pool = normalized switch
        {
            SharinganCanonicalLayers.Lineages.Madara =>
            [
                SharinganCanonicalLayers.Lineages.Itachi,
                SharinganCanonicalLayers.Lineages.Sasuke,
                SharinganCanonicalLayers.Lineages.Obito
            ],
            SharinganCanonicalLayers.Lineages.Itachi =>
            [
                SharinganCanonicalLayers.Lineages.Madara,
                SharinganCanonicalLayers.Lineages.Sasuke,
                SharinganCanonicalLayers.Lineages.Obito,
                SharinganCanonicalLayers.Lineages.Shisui
            ],
            _ =>
            [
                SharinganCanonicalLayers.Lineages.Madara,
                SharinganCanonicalLayers.Lineages.Itachi
            ]
        };

        return pool[seedHash % pool.Length];
    }

    private static (string? Primary, string? Secondary) ExtractColorPairHint(string normalizedPrompt)
    {
        if (Regex.IsMatch(normalizedPrompt, @"\b(dourad\w*|ouro|gold\w*|amarel\w*|yellow)\b", RegexOptions.CultureInvariant))
        {
            return ("#F59E0B", "#451A03");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(rox\w*|violet\w*|purple)\b", RegexOptions.CultureInvariant))
        {
            return ("#A855F7", "#3B0764");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(azu[il]\w*|cian\w*|blue|cyan)\b", RegexOptions.CultureInvariant))
        {
            return ("#3B82F6", "#172554");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(verdes?|esmerald\w*|green)\b", RegexOptions.CultureInvariant))
        {
            return ("#10B981", "#064E3B");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(branc\w*|prata\w*|white|silver)\b", RegexOptions.CultureInvariant))
        {
            return ("#E4E4E7", "#27272A");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(laranj\w*|orange)\b", RegexOptions.CultureInvariant))
        {
            return ("#F97316", "#431407");
        }

        if (Regex.IsMatch(normalizedPrompt, @"\b(rosa|rosas|pink)\b", RegexOptions.CultureInvariant))
        {
            return ("#EC4899", "#500724");
        }

        return (null, null);
    }

    private static string PickVariantFallbackColor(string styleVariant, int seedHash)
        => "#DC2626";

    private static string BuildDynamicFallbackName(
        string styleVariant,
        string primaryLineage,
        string? secondaryLineage,
        bool isEternalFusion,
        string centerShape,
        string bladeStyle,
        int seedHash)
    {
        if (isEternalFusion && !string.IsNullOrWhiteSpace(secondaryLineage))
        {
            var pTitle = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(primaryLineage);
            var sTitle = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(secondaryLineage);
            string[] fusionPrefixes =
            [
                "Mangekyou Sharingan Eterno",
                "Tsukuyomi Eterno",
                "Fusão Choku-Tomoe",
                "Doujutsu Eterno Uchiha"
            ];
            return $"{fusionPrefixes[seedHash % fusionPrefixes.Length]}: {sTitle} × {pTitle}";
        }

        string[] prefixes =
        [
            "Mangekyou Ancestral",
            "Olho do Eclipse Sombrio",
            "Mangekyou Carmesim",
            "Selo Ocular de Indra",
            "Doujutsu do Abismo"
        ];
        var suffix = centerShape switch
        {
            AnimeAccurateSharinganSvgBuilder.CenterShapes.Square => "Cubo Dimensional",
            AnimeAccurateSharinganSvgBuilder.CenterShapes.Diamond => "Prisma Cortante",
            AnimeAccurateSharinganSvgBuilder.CenterShapes.Triangle => "Tríade do Genjutsu",
            AnimeAccurateSharinganSvgBuilder.CenterShapes.Hexagram => "Hexagrama do Destino",
            AnimeAccurateSharinganSvgBuilder.CenterShapes.Vortex => "Vórtice Etéreo",
            _ => bladeStyle switch
            {
                AnimeAccurateSharinganSvgBuilder.BladeStyles.FlameSerrated => "Chamas Negras",
                _ => $"Linhagem {CultureInfo.InvariantCulture.TextInfo.ToTitleCase(primaryLineage)}"
            }
        };

        return $"{prefixes[seedHash % prefixes.Length]}: {suffix}";
    }

    private static string BuildDynamicFallbackLore(
        string styleVariant,
        string primaryLineage,
        string? secondaryLineage,
        bool isEternalFusion,
        string? prompt,
        string centerShape,
        int seedHash)
    {
        string[] angles =
        [
            "Forjado nas chamas do santuário secreto Naka",
            "Desperto sob a lua carmesim do Tsukuyomi Infinito",
            "Estabilizado pela fusão perfeita de Chakra Uchiha",
            "Condensado a partir da linhagem ocular ancestral"
        ];

        var coreLore = isEternalFusion && !string.IsNullOrWhiteSpace(secondaryLineage)
            ? $"Olho Esquerdo canaliza a estrutura eterna de {CultureInfo.InvariantCulture.TextInfo.ToTitleCase(secondaryLineage)} enquanto o Olho Direito manifesta as lâminas de {CultureInfo.InvariantCulture.TextInfo.ToTitleCase(primaryLineage)} sem desgaste de cegueira."
            : centerShape switch
            {
                "square" => "Núcleo quadrangular simétrico que aprisiona o tempo de foco",
                "diamond" => "Núcleo diamantado que estilhaça ilusões e distrações",
                "triangle" => "Selo triangular equilátero que amplifica a concentração",
                "hexagram" => "Hexagrama simétrico que harmoniza Chakra e disciplina",
                "vortex" => "Espiral abissal que suga qualquer procrastinação",
                _ => $"Íris carmesim canônica da linhagem {CultureInfo.InvariantCulture.TextInfo.ToTitleCase(primaryLineage)}"
            };

        var promptSuffix = string.IsNullOrWhiteSpace(prompt)
            ? string.Empty
            : $" Canalizado pelo pedido: \"{prompt.Trim()}\".";

        return $"{angles[seedHash % angles.Length]}. {coreLore}{promptSuffix}";
    }

    private static string BuildDynamicFallbackMood(
        string styleVariant,
        bool isEternalFusion,
        bool hasAmaterasuFlames,
        int seedHash)
    {
        if (hasAmaterasuFlames)
        {
            return "Fúria Carmesim do Amaterasu";
        }

        if (isEternalFusion)
        {
            return "Domínio Eterno Uchiha";
        }

        string[] moods = ["Concentração Absoluta", "Determinação Sombria", "Domínio Dimensional", "Lucidez Etérea"];
        return $"{moods[seedHash % moods.Length]} ({styleVariant})";
    }

    private static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(ch);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    private static string NormalizeImageDataUriOrUrl(string input)
    {
        var trimmed = input.Trim();
        if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        return $"data:image/jpeg;base64,{trimmed}";
    }

    private static string StripMarkdownFences(string content)
    {
        var stripped = Regex.Replace(content, @"```(?:json|svg|xml|text)?\s*", string.Empty, RegexOptions.IgnoreCase);
        return stripped.Replace("```", string.Empty, StringComparison.Ordinal).Trim();
    }

    private static string ExtractJsonObject(string content)
    {
        var trimmed = content.Trim();
        var start = trimmed.IndexOf('{');
        var end = trimmed.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            return trimmed.Substring(start, end - start + 1);
        }

        return trimmed;
    }

    private static string? TryExtractSvgElement(string content)
    {
        var match = Regex.Match(content, @"<svg[\s\S]*?<\/svg>", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            return null;
        }

        var value = match.Value;
        return value.Contains("\\\"", StringComparison.Ordinal)
            ? value.Replace("\\\"", "\"", StringComparison.Ordinal)
                .Replace("\\n", "\n", StringComparison.Ordinal)
                .Replace("\\r", string.Empty, StringComparison.Ordinal)
                .Replace("\\t", " ", StringComparison.Ordinal)
                .Replace("\\/", "/", StringComparison.Ordinal)
            : value;
    }

    private static string? TryExtractJsonStringField(string content, string fieldName)
    {
        var match = Regex.Match(
            content,
            $@"""{Regex.Escape(fieldName)}""\s*:\s*""((?:\\.|[^""\\])*)""",
            RegexOptions.IgnoreCase);

        if (!match.Success)
        {
            return null;
        }

        return match.Groups[1].Value
            .Replace("\\\"", "\"", StringComparison.Ordinal)
            .Replace("\\n", " ", StringComparison.Ordinal)
            .Replace("\\/", "/", StringComparison.Ordinal)
            .Trim();
    }

    private static double? TryExtractJsonDoubleField(string content, string fieldName)
    {
        var match = Regex.Match(
            content,
            $@"""{Regex.Escape(fieldName)}""\s*:\s*(-?\d+(?:\.\d+)?)",
            RegexOptions.IgnoreCase);

        if (!match.Success)
        {
            return null;
        }

        return double.TryParse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static int? TryExtractJsonIntField(string content, string fieldName)
    {
        var numeric = TryExtractJsonDoubleField(content, fieldName);
        return numeric.HasValue ? (int)Math.Round(numeric.Value) : null;
    }

    private static bool? TryExtractJsonBoolField(string content, string fieldName)
    {
        var match = Regex.Match(
            content,
            $@"""{Regex.Escape(fieldName)}""\s*:\s*(true|false)",
            RegexOptions.IgnoreCase);

        if (!match.Success)
        {
            return null;
        }

        return string.Equals(match.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static int? ExtractBladeCountHint(string? prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            return null;
        }

        var match = Regex.Match(prompt, @"\b([2-9]|1[0-2])\s*(?:laminas|lâminas|tomoes|pontas|blades|ponteiros|lados)\b", RegexOptions.IgnoreCase);
        if (match.Success && int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var count))
        {
            return count;
        }

        return null;
    }
}
