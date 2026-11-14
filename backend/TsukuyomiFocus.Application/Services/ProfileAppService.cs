using System.Data;
using System.Data.Common;
using Microsoft.Extensions.Logging;
using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Mappers;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.Interfaces.Services;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Application.Services;

public sealed class ProfileAppService : IProfileAppService
{
    private const int DefaultRecentLogsLimit = 30;
    private const string ProfileNotFoundMessage = "Perfil Uchiha padrão não encontrado.";
    private const string ProfileNotFoundCode = "PROFILE_NOT_FOUND";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IProfileRepository _profileRepository;
    private readonly ISharinganAiGeneratorService _sharinganAiGeneratorService;
    private readonly ILogger<ProfileAppService> _logger;

    public ProfileAppService(
        IDbConnectionFactory connectionFactory,
        IProfileRepository profileRepository,
        ISharinganAiGeneratorService sharinganAiGeneratorService,
        ILogger<ProfileAppService> logger)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _profileRepository = profileRepository ?? throw new ArgumentNullException(nameof(profileRepository));
        _sharinganAiGeneratorService = sharinganAiGeneratorService ?? throw new ArgumentNullException(nameof(sharinganAiGeneratorService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<ServiceResult<AppStateResponseDto>> GetFullStateAsync(CancellationToken cancellationToken = default)
    {
        return ExecuteInProfileTransactionAsync(async (profile, connection, transaction, today, nowUtc) =>
        {
            var (penaltyApplied, penaltyChakra, expiredTitles) =
                await ApplyAmaterasuDailyCheckAsync(profile, today, nowUtc, connection, transaction, cancellationToken);

            var missions = await _profileRepository.GetAllMissionsByUserAsync(
                profile.Id,
                connection,
                transaction,
                cancellationToken);

            var recentLogs = await _profileRepository.GetRecentLogsByUserAsync(
                profile.Id,
                DefaultRecentLogsLimit,
                connection,
                transaction,
                cancellationToken);

            return ServiceResult<AppStateResponseDto>.Ok(
                profile.ToAppStateDto(missions, recentLogs, penaltyApplied, penaltyChakra, expiredTitles));
        }, cancellationToken);
    }

    public Task<ServiceResult<DailyCheckResponseDto>> RunDailyCheckAsync(CancellationToken cancellationToken = default)
    {
        return ExecuteInProfileTransactionAsync(async (profile, connection, transaction, today, nowUtc) =>
        {
            var (penaltyApplied, penaltyChakra, expiredTitles) =
                await ApplyAmaterasuDailyCheckAsync(profile, today, nowUtc, connection, transaction, cancellationToken);

            return ServiceResult<DailyCheckResponseDto>.Ok(
                profile.ToDailyCheckDto(penaltyApplied, penaltyChakra, expiredTitles));
        }, cancellationToken);
    }

    public Task<ServiceResult<ProfileDto>> UpdateEyeCustomizationAsync(
        EyeCustomizationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Task.FromResult(ServiceResult<ProfileDto>.BadRequest(
                "Corpo da requisição inválido.",
                "INVALID_REQUEST"));
        }

        return ExecuteInProfileTransactionAsync(async (profile, connection, transaction, _, nowUtc) =>
        {
            profile.CustomizeEyes(
                request.EquippedEyeStage,
                request.MangekyouVariant,
                request.CustomEyeImageUrl,
                request.ClearCustomEyeImage,
                nowUtc);

            await _profileRepository.UpdateAsync(profile, connection, transaction, cancellationToken);

            return ServiceResult<ProfileDto>.Ok(profile.ToProfileDto());
        }, cancellationToken);
    }

    public Task<ServiceResult<AppStateResponseDto>> DevSimulateAsync(
        DevSimulateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Task.FromResult(ServiceResult<AppStateResponseDto>.BadRequest(
                "Corpo da requisição inválido.",
                "INVALID_REQUEST"));
        }

        return ExecuteInProfileTransactionAsync(async (profile, connection, transaction, _, nowUtc) =>
        {
            profile.ApplyDevSimulation(
                request.AddChakra,
                request.UnlockAllEyes,
                request.ResetBlindness,
                request.SimulateLeftEyeBlind,
                request.SimulateRightEyeBlind,
                request.SetVisualBlurLevel,
                request.SetCurrentStreak,
                nowUtc);

            await _profileRepository.UpdateAsync(profile, connection, transaction, cancellationToken);

            var missions = await _profileRepository.GetAllMissionsByUserAsync(
                profile.Id,
                connection,
                transaction,
                cancellationToken);

            var recentLogs = await _profileRepository.GetRecentLogsByUserAsync(
                profile.Id,
                DefaultRecentLogsLimit,
                connection,
                transaction,
                cancellationToken);

            return ServiceResult<AppStateResponseDto>.Ok(
                profile.ToAppStateDto(missions, recentLogs));
        }, cancellationToken);
    }

    public async Task<ServiceResult<GenerateSharinganResponseDto>> GenerateCustomSharinganAsync(
        GenerateSharinganRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return ServiceResult<GenerateSharinganResponseDto>.BadRequest(
                "Corpo da requisição inválido.",
                "INVALID_REQUEST");
        }

        var normalizedVariant = string.IsNullOrWhiteSpace(request.StyleVariant)
            ? LoreRules.MangekyouVariants.Itachi
            : request.StyleVariant.Trim().ToLowerInvariant();

        if (!string.Equals(normalizedVariant, "custom", StringComparison.Ordinal) &&
            !LoreRules.MangekyouVariants.IsValid(normalizedVariant))
        {
            return ServiceResult<GenerateSharinganResponseDto>.BadRequest(
                $"Variante de estilo '{request.StyleVariant}' inválida. Valores aceitos: itachi, sasuke, shisui, obito, madara, custom.",
                "INVALID_STYLE_VARIANT");
        }

        var normalizedOutputFormat = string.IsNullOrWhiteSpace(request.OutputFormat)
            ? "svg"
            : request.OutputFormat.Trim().ToLowerInvariant();

        if (normalizedOutputFormat is not ("svg" or "raster"))
        {
            return ServiceResult<GenerateSharinganResponseDto>.BadRequest(
                $"Formato de saída '{request.OutputFormat}' inválido. Use 'svg' ou 'raster'.",
                "INVALID_OUTPUT_FORMAT");
        }

        if (!string.IsNullOrWhiteSpace(request.BaseEyeImageBase64))
        {
            var trimmedImage = request.BaseEyeImageBase64.Trim();
            if (trimmedImage.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase) ||
                trimmedImage.StartsWith("vbscript:", StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult<GenerateSharinganResponseDto>.BadRequest(
                    "Imagem base inválida.",
                    "INVALID_BASE_EYE_IMAGE");
            }
        }

        GeneratedSharinganResult generated;
        try
        {
            generated = await _sharinganAiGeneratorService.GenerateSharinganAsync(
                request.Prompt,
                request.BaseEyeImageBase64,
                normalizedVariant,
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar Sharingan via IA para variante {StyleVariant}.", normalizedVariant);
            return ServiceResult<GenerateSharinganResponseDto>.BadRequest(
                "Não foi possível gerar o Sharingan customizado no momento.",
                "AI_GENERATION_FAILED");
        }

        var safeResult = EnsureValidSvgResult(generated, normalizedVariant);
        var equippedImageUrl = string.Equals(normalizedOutputFormat, "raster", StringComparison.Ordinal) &&
                               !string.IsNullOrWhiteSpace(safeResult.RasterImageUrl)
            ? safeResult.RasterImageUrl
            : safeResult.SvgDataUri;

        if (!request.AutoEquip)
        {
            return ServiceResult<GenerateSharinganResponseDto>.Ok(
                safeResult.ToGenerateSharinganResponseDto(equippedImageUrl, false));
        }

        var variantToEquip = LoreRules.MangekyouVariants.IsValid(normalizedVariant)
            ? normalizedVariant
            : null;

        return await ExecuteInProfileTransactionAsync(async (profile, connection, transaction, _, nowUtc) =>
        {
            profile.CustomizeEyes(
                equippedEyeStage: null,
                mangekyouVariant: variantToEquip,
                customEyeImageUrl: equippedImageUrl,
                clearCustomEyeImage: false,
                nowUtc: nowUtc);

            await _profileRepository.UpdateAsync(profile, connection, transaction, cancellationToken);

            return ServiceResult<GenerateSharinganResponseDto>.Ok(
                safeResult.ToGenerateSharinganResponseDto(equippedImageUrl, true, profile));
        }, cancellationToken);
    }

    private GeneratedSharinganResult EnsureValidSvgResult(
        GeneratedSharinganResult result,
        string styleVariant)
    {
        if (SharinganSvgHelper.TryValidateAndSanitize(result.RawSvgCode, out var sanitizedSvg))
        {
            var dataUri = string.IsNullOrWhiteSpace(result.SvgDataUri)
                ? SharinganSvgHelper.ToSvgDataUri(sanitizedSvg)
                : result.SvgDataUri;

            return result with
            {
                RawSvgCode = sanitizedSvg,
                SvgDataUri = dataUri,
                PrimaryGlowColor = SharinganSvgHelper.NormalizeHexColor(result.PrimaryGlowColor)
            };
        }

        _logger.LogWarning(
            "SVG retornado pelo provedor de IA estava inválido ou malformado para {StyleVariant}; aplicando fallback simétrico seguro.",
            styleVariant);

        var glowColor = SharinganSvgHelper.NormalizeHexColor(result.PrimaryGlowColor);
        var fallbackSvg = SharinganSvgHelper.BuildFallbackSvg(styleVariant, glowColor);
        SharinganSvgHelper.TryValidateAndSanitize(fallbackSvg, out var sanitizedFallback);

        return result with
        {
            RawSvgCode = sanitizedFallback,
            SvgDataUri = SharinganSvgHelper.ToSvgDataUri(sanitizedFallback),
            PrimaryGlowColor = glowColor
        };
    }

    private async Task<ServiceResult<T>> ExecuteInProfileTransactionAsync<T>(
        Func<UserProfile, DbConnection, DbTransaction, DateOnly, DateTime, Task<ServiceResult<T>>> operation,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(nowUtc);

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var profile = await _profileRepository.GetDefaultForUpdateAsync(connection, transaction, cancellationToken);
            if (profile is null)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return ServiceResult<T>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
            }

            var result = await operation(profile, connection, transaction, today, nowUtc);
            if (!result.IsSuccess)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return result;
            }

            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch (DomainException ex)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return ServiceResult<T>.BadRequest(ex.Message, ex.Code);
        }
        catch (NotFoundException ex)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return ServiceResult<T>.NotFound(ex.Message, ex.Code);
        }
    }

    private async Task<(bool PenaltyApplied, int PenaltyChakra, IReadOnlyList<string> ExpiredTitles)> ApplyAmaterasuDailyCheckAsync(
        UserProfile profile,
        DateOnly today,
        DateTime nowUtc,
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken)
    {
        var expiredMissions = await _profileRepository.GetExpiredAmaterasuMissionsAsync(
            profile.Id,
            today,
            connection,
            transaction,
            cancellationToken);

        var needsCheckDateUpdate = profile.LastAmaterasuCheckDate != today;
        var deductedChakra = profile.ApplyAmaterasuPenalty(expiredMissions.Count, today, nowUtc);

        if (expiredMissions.Count > 0)
        {
            var expiredIds = expiredMissions.Select(m => m.Id).ToArray();
            await _profileRepository.ClearAmaterasuFlagsAsync(
                expiredIds,
                connection,
                transaction,
                cancellationToken);

            await _profileRepository.UpdateAsync(profile, connection, transaction, cancellationToken);

            var expiredTitles = expiredMissions.Select(m => m.Title).ToList();
            return (true, deductedChakra, expiredTitles);
        }

        if (needsCheckDateUpdate)
        {
            await _profileRepository.UpdateAsync(profile, connection, transaction, cancellationToken);
        }

        return (false, 0, Array.Empty<string>());
    }
}
