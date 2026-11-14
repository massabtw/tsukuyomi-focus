using System.Data;
using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Mappers;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Application.Services;

public sealed class SessionAppService : ISessionAppService
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ISessionRepository _sessionRepository;

    public SessionAppService(
        IDbConnectionFactory connectionFactory,
        ISessionRepository sessionRepository)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _sessionRepository = sessionRepository ?? throw new ArgumentNullException(nameof(sessionRepository));
    }

    public Task<ServiceResult<CompleteSessionResponseDto>> CompleteSessionAsync(
        CompleteSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Task.FromResult(ServiceResult<CompleteSessionResponseDto>.BadRequest(
                "Os dados da sessão são obrigatórios.",
                "INVALID_REQUEST"));
        }

        return ExecuteProfileTransactionAsync(async (connection, transaction, profile, today, nowUtc) =>
        {
            var (missionFound, mission) = await TryGetOptionalMissionAsync(
                profile.Id,
                request.MissionId,
                connection,
                transaction,
                cancellationToken);

            if (!missionFound)
            {
                return ServiceResult<CompleteSessionResponseDto>.NotFound(
                    "Missão não encontrada.",
                    "MISSION_NOT_FOUND");
            }

            var outcome = profile.ApplyFocusSession(
                request.DurationMinutes,
                mission?.Rank,
                mission?.IsAmaterasu ?? false,
                request.WasSusanooActive,
                today,
                nowUtc);

            Mission? updatedMission = null;
            if (mission is not null)
            {
                mission.RecordCompletedCycle(request.DurationMinutes, request.MarkMissionCompleted, nowUtc);
                updatedMission = await _sessionRepository.AddMissionProgressAsync(
                    mission.Id,
                    request.DurationMinutes,
                    request.MarkMissionCompleted,
                    connection,
                    transaction,
                    cancellationToken);
            }

            var sessionLog = FocusSessionLog.CreateCompleted(
                profile.Id,
                mission,
                request.DurationMinutes,
                outcome.ChakraEarned,
                request.WasSusanooActive,
                today,
                nowUtc);

            var insertedLog = await _sessionRepository.InsertSessionLogAsync(
                sessionLog,
                connection,
                transaction,
                cancellationToken);

            var updatedProfile = await _sessionRepository.UpdateProfileAsync(
                profile,
                connection,
                transaction,
                cancellationToken);

            return ServiceResult<CompleteSessionResponseDto>.Ok(
                insertedLog.ToCompleteResponseDto(updatedProfile, updatedMission ?? mission, outcome));
        }, cancellationToken);
    }

    public Task<ServiceResult<AbandonSessionResponseDto>> AbandonSessionAsync(
        AbandonSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Task.FromResult(ServiceResult<AbandonSessionResponseDto>.BadRequest(
                "Os dados da sessão são obrigatórios.",
                "INVALID_REQUEST"));
        }

        return ExecuteProfileTransactionAsync(async (connection, transaction, profile, today, nowUtc) =>
        {
            var (missionFound, mission) = await TryGetOptionalMissionAsync(
                profile.Id,
                request.MissionId,
                connection,
                transaction,
                cancellationToken);

            if (!missionFound)
            {
                return ServiceResult<AbandonSessionResponseDto>.NotFound(
                    "Missão não encontrada.",
                    "MISSION_NOT_FOUND");
            }

            var chakraPenaltyApplied = profile.ApplyAbandonPenalty(
                request.DurationMinutesElapsed,
                request.WasSusanooActive,
                request.UseIzanagiToPreventPenalty,
                today,
                nowUtc);

            var sessionLog = FocusSessionLog.CreateAbandoned(
                profile.Id,
                mission,
                request.DurationMinutesElapsed,
                request.WasSusanooActive,
                today,
                nowUtc);

            var insertedLog = await _sessionRepository.InsertSessionLogAsync(
                sessionLog,
                connection,
                transaction,
                cancellationToken);

            var updatedProfile = await _sessionRepository.UpdateProfileAsync(
                profile,
                connection,
                transaction,
                cancellationToken);

            return ServiceResult<AbandonSessionResponseDto>.Ok(
                insertedLog.ToAbandonResponseDto(
                    updatedProfile,
                    request.UseIzanagiToPreventPenalty,
                    chakraPenaltyApplied));
        }, cancellationToken);
    }

    public Task<ServiceResult<IzanagiInvocationResponseDto>> InvokeIzanagiAsync(
        InvokeIzanagiRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        return ExecuteProfileTransactionAsync(async (connection, transaction, profile, today, nowUtc) =>
        {
            var blindedEye = profile.InvokeIzanagi(today, nowUtc);

            var updatedProfile = await _sessionRepository.UpdateProfileAsync(
                profile,
                connection,
                transaction,
                cancellationToken);

            var eyeLabel = string.Equals(blindedEye, "left", StringComparison.Ordinal)
                ? "olho esquerdo"
                : "olho direito";

            var trimmedReason = request?.Reason?.Trim();
            var reasonSuffix = string.IsNullOrEmpty(trimmedReason)
                ? string.Empty
                : $" ({trimmedReason})";

            var message = $"Izanagi invocado{reasonSuffix}. A realidade foi reescrita ao custo da luz do {eyeLabel}.";

            return ServiceResult<IzanagiInvocationResponseDto>.Ok(
                updatedProfile.ToIzanagiResponseDto(blindedEye, message));
        }, cancellationToken);
    }

    private async Task<(bool Found, Mission? Mission)> TryGetOptionalMissionAsync(
        Guid userId,
        Guid? missionId,
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken)
    {
        if (!missionId.HasValue)
        {
            return (true, null);
        }

        var mission = await _sessionRepository.GetMissionByIdAsync(
            userId,
            missionId.Value,
            connection,
            transaction,
            cancellationToken);

        return mission is null ? (false, null) : (true, mission);
    }

    private async Task<ServiceResult<TResponse>> ExecuteProfileTransactionAsync<TResponse>(
        Func<IDbConnection, IDbTransaction, UserProfile, DateOnly, DateTime, Task<ServiceResult<TResponse>>> action,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(nowUtc);

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var profile = await _sessionRepository.GetDefaultProfileForUpdateAsync(connection, transaction, cancellationToken);
            if (profile is null)
            {
                await transaction.RollbackAsync(CancellationToken.None);
                return ServiceResult<TResponse>.NotFound("Perfil de usuário não encontrado.", "PROFILE_NOT_FOUND");
            }

            var result = await action(connection, transaction, profile, today, nowUtc);
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
            return ServiceResult<TResponse>.BadRequest(ex.Message, ex.Code);
        }
        catch (NotFoundException ex)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return ServiceResult<TResponse>.NotFound(ex.Message, ex.Code);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
