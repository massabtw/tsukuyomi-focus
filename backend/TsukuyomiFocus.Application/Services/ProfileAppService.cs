using System.Data;
using System.Data.Common;
using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Mappers;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Application.Services;

public sealed class ProfileAppService : IProfileAppService
{
    private const int DefaultRecentLogsLimit = 30;
    private const string ProfileNotFoundMessage = "Perfil Uchiha padrão não encontrado.";
    private const string ProfileNotFoundCode = "PROFILE_NOT_FOUND";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IProfileRepository _profileRepository;

    public ProfileAppService(
        IDbConnectionFactory connectionFactory,
        IProfileRepository profileRepository)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _profileRepository = profileRepository ?? throw new ArgumentNullException(nameof(profileRepository));
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
