using System.Net.Http.Json;
using System.Text.Json;
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

    private const string SystemPrompt = """
        Você é um Mestre Engenheiro de SVG Vetorial e Especialista em Lore do Clã Uchiha (Naruto).
        Sua tarefa é criar um Mangekyou Sharingan único, simétrico e cinematográfico.

        Responda ESTRITAMENTE em JSON válido (sem markdown fora do JSON), contendo exatamente as seguintes chaves:
        {
          "doujutsuName": "Nome épico do Doujutsu em Português (ex: Mangekyou Sharingan: Eclipse Carmesim do Amaterasu)",
          "loreDescription": "Descrição curta incluindo Habilidade do Olho Esquerdo e Habilidade do Olho Direito em Português.",
          "primaryGlowColor": "#DC2626",
          "imageGenerationPrompt": "Detailed English prompt for a high-contrast dark crimson glowing Mangekyou Sharingan iris macro artwork on pure obsidian background",
          "svgCode": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" width=\"100%\" height=\"100%\">...</svg>"
        }

        REGRAS ESTRITAS PARA O svgCode:
        1. Deve começar com <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%"> e fechar com </svg>.
        2. Fundo circular escuro profundo (<circle cx="256" cy="256" r="250" fill="#09090B" />).
        3. Anéis concêntricos de íris vermelha carmesim (#DC2626, #991B1B, #450A0A) usando <radialGradient> e <filter> com <feGaussianBlur> para drop-shadow/glow.
        4. Padrões geométricos simétricos perfeitos usando <g transform="rotate(120 256 256)"> (simetria trina) ou <g transform="rotate(90 256 256)"> (simetria quádrupla), inspirados nas lâminas curvas e tomoes afiados do Mangekyou Sharingan e na pupila central hipnótica em #09090B.
        5. NUNCA inclua elementos <text>, <script>, manipuladores onclick/onload ou formas fora do círculo de centro (256, 256) e raio 250, para que possa girar perfeitamente no centro de um relógio ocular.
        6. Garanta XML 100% bem formado com todas as aspas duplas escapadas corretamente dentro da string JSON.
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

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("GroqSettings:ApiKey não configurada. Retornando Sharingan vetorial fallback para variante {Variant}.", normalizedVariant);
            return BuildFallbackResult(prompt, normalizedVariant, null);
        }

        GroqSharinganJsonModel? parsedJson = null;

        if (!string.IsNullOrWhiteSpace(baseEyeImageBase64))
        {
            parsedJson = await TryInvokeGroqVisionAsync(
                prompt,
                NormalizeImageDataUriOrUrl(baseEyeImageBase64),
                normalizedVariant,
                cancellationToken);
        }

        if (parsedJson is null)
        {
            parsedJson = await TryInvokeGroqTextAsync(
                prompt,
                !string.IsNullOrWhiteSpace(baseEyeImageBase64),
                normalizedVariant,
                cancellationToken);
        }

        return BuildResultFromGroqResponse(parsedJson, prompt, normalizedVariant);
    }

    private async Task<GroqSharinganJsonModel?> TryInvokeGroqVisionAsync(
        string? prompt,
        string imageUrlOrDataUri,
        string styleVariant,
        CancellationToken cancellationToken)
    {
        var userInstruction = BuildUserTextInstruction(prompt, styleVariant, hasReferenceImage: true);

        var request = new GroqChatCompletionRequestModel
        {
            Model = _options.VisionModel,
            Temperature = 0.65,
            MaxTokens = 4096,
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
                    Content = new List<GroqContentPartModel>
                    {
                        new()
                        {
                            Type = "text",
                            Text = userInstruction
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

        return await SendChatCompletionAsync(request, "Vision", cancellationToken);
    }

    private async Task<GroqSharinganJsonModel?> TryInvokeGroqTextAsync(
        string? prompt,
        bool cameFromVisionFallback,
        string styleVariant,
        CancellationToken cancellationToken)
    {
        var userInstruction = BuildUserTextInstruction(prompt, styleVariant, hasReferenceImage: cameFromVisionFallback);

        var request = new GroqChatCompletionRequestModel
        {
            Model = _options.TextModel,
            Temperature = 0.7,
            MaxTokens = 4096,
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

        return await SendChatCompletionAsync(request, "Text", cancellationToken);
    }

    private async Task<GroqSharinganJsonModel?> SendChatCompletionAsync(
        GroqChatCompletionRequestModel request,
        string modeLabel,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(
                _options.BaseUrl,
                request,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Groq API ({Mode} / {Model}) retornou HTTP {StatusCode}: {Body}",
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
                _logger.LogWarning("Groq API ({Mode}) retornou conteúdo vazio.", modeLabel);
                return null;
            }

            var jsonContent = ExtractJsonObject(rawContent);
            return JsonSerializer.Deserialize<GroqSharinganJsonModel>(jsonContent, JsonOptions);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Falha ao chamar ou desserializar resposta do Groq ({Mode} / {Model}).",
                modeLabel,
                request.Model);
            return null;
        }
    }

    private GeneratedSharinganResult BuildResultFromGroqResponse(
        GroqSharinganJsonModel? groqJson,
        string? userPrompt,
        string styleVariant)
    {
        if (groqJson is null)
        {
            return BuildFallbackResult(userPrompt, styleVariant, null);
        }

        var glowColor = SharinganSvgHelper.NormalizeHexColor(groqJson.PrimaryGlowColor);
        var doujutsuName = string.IsNullOrWhiteSpace(groqJson.DoujutsuName)
            ? BuildFallbackName(styleVariant)
            : groqJson.DoujutsuName.Trim();

        var loreDescription = string.IsNullOrWhiteSpace(groqJson.LoreDescription)
            ? BuildFallbackLore(styleVariant, userPrompt)
            : groqJson.LoreDescription.Trim();

        var rawSvg = SharinganSvgHelper.TryValidateAndSanitize(groqJson.SvgCode, out var sanitizedSvg)
            ? sanitizedSvg
            : BuildValidatedFallbackSvg(styleVariant, glowColor);

        var imagePrompt = string.IsNullOrWhiteSpace(groqJson.ImageGenerationPrompt)
            ? BuildDefaultRasterPrompt(styleVariant, userPrompt)
            : groqJson.ImageGenerationPrompt.Trim();

        return new GeneratedSharinganResult
        {
            DoujutsuName = doujutsuName,
            LoreDescription = loreDescription,
            RawSvgCode = rawSvg,
            SvgDataUri = SharinganSvgHelper.ToSvgDataUri(rawSvg),
            RasterImageUrl = BuildPollinationsUrl(imagePrompt),
            PrimaryGlowColor = glowColor
        };
    }

    private static GeneratedSharinganResult BuildFallbackResult(
        string? userPrompt,
        string styleVariant,
        string? primaryGlowColor)
    {
        var glow = SharinganSvgHelper.NormalizeHexColor(primaryGlowColor);
        var fallbackSvg = BuildValidatedFallbackSvg(styleVariant, glow);
        var rasterPrompt = BuildDefaultRasterPrompt(styleVariant, userPrompt);

        return new GeneratedSharinganResult
        {
            DoujutsuName = BuildFallbackName(styleVariant),
            LoreDescription = BuildFallbackLore(styleVariant, userPrompt),
            RawSvgCode = fallbackSvg,
            SvgDataUri = SharinganSvgHelper.ToSvgDataUri(fallbackSvg),
            RasterImageUrl = BuildPollinationsUrl(rasterPrompt),
            PrimaryGlowColor = glow
        };
    }

    private static string BuildValidatedFallbackSvg(string styleVariant, string glow)
    {
        var svg = SharinganSvgHelper.BuildFallbackSvg(styleVariant, glow);
        return SharinganSvgHelper.TryValidateAndSanitize(svg, out var sanitized) ? sanitized : svg;
    }

    private static string BuildPollinationsUrl(string imagePrompt)
    {
        var seed = Random.Shared.Next(100_000, 999_999);
        return $"https://image.pollinations.ai/prompt/{Uri.EscapeDataString(imagePrompt)}?width=512&height=512&nologo=true&seed={seed}";
    }

    private static string BuildUserTextInstruction(string? prompt, string styleVariant, bool hasReferenceImage)
    {
        var userPromptText = string.IsNullOrWhiteSpace(prompt)
            ? $"Crie um Mangekyou Sharingan fiel ao estilo '{styleVariant}' com estética sombria de obsidiana e brilho carmesim."
            : prompt.Trim();

        var referenceHint = hasReferenceImage
            ? "Analise as características marcantes do olho de referência (se visível) e funda-as na geometria do Sharingan/Mangekyou."
            : "Baseie a geometria exclusivamente na descrição do usuário e no estilo solicitado.";

        return $"""
            Estilo base solicitado: {styleVariant}
            Instrução visual: {userPromptText}
            Diretriz adicional: {referenceHint}

            Lembre-se: gere o JSON estrito com svgCode simétrico dentro de viewBox="0 0 512 512" e centro (256, 256).
            """;
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

        return $"data:image/png;base64,{trimmed}";
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

    private static string BuildFallbackName(string styleVariant) => styleVariant switch
    {
        LoreRules.MangekyouVariants.Sasuke => "Mangekyou Sharingan: Choku-Tomoe das Chamas Negras",
        LoreRules.MangekyouVariants.Shisui => "Mangekyou Sharingan: Eclipse do Kotoamatsukami",
        LoreRules.MangekyouVariants.Obito => "Mangekyou Sharingan: Vórtice Espacial do Kamui",
        LoreRules.MangekyouVariants.Madara => "Mangekyou Sharingan Eterno: Soberano do Clã Uchiha",
        LoreRules.MangekyouVariants.Itachi => "Mangekyou Sharingan: Eclipse Carmesim do Tsukuyomi",
        _ => "Mangekyou Sharingan Desperto: Lâmina de Obsidiana"
    };

    private static string BuildFallbackLore(string styleVariant, string? prompt)
    {
        var customNote = string.IsNullOrWhiteSpace(prompt)
            ? string.Empty
            : $" Sintonizado com: {prompt.Trim()}.";

        return $"Olho Esquerdo canaliza percepção temporal absoluta para sessões de foco profundo; Olho Direito conjura chamas carmesins que purgam distrações.{customNote}";
    }

    private static string BuildDefaultRasterPrompt(string styleVariant, string? prompt)
    {
        var extra = string.IsNullOrWhiteSpace(prompt) ? string.Empty : $", {prompt.Trim()}";
        return $"close up glowing crimson Mangekyou Sharingan eye {styleVariant} style, dark obsidian sclera, intricate symmetrical black geometric blades inside blood red iris, anime dark cinematic aesthetic{extra}";
    }
}
