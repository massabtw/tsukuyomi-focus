using TsukuyomiFocus.Application.Common;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Application.Interfaces;
using TsukuyomiFocus.Application.Mappers;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Application.Services;

public sealed class MissionAppService : IMissionAppService
{
    private const string ProfileNotFoundMessage = "Perfil ninja não encontrado.";
    private const string ProfileNotFoundCode = "PROFILE_NOT_FOUND";
    private const string MissionNotFoundMessage = "Missão não encontrada.";
    private const string MissionNotFoundCode = "MISSION_NOT_FOUND";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IMissionRepository _missionRepository;

    public MissionAppService(IDbConnectionFactory connectionFactory, IMissionRepository missionRepository)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _missionRepository = missionRepository ?? throw new ArgumentNullException(nameof(missionRepository));
    }

    public async Task<ServiceResult<IReadOnlyList<MissionDto>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var userId = await _missionRepository.GetDefaultUserIdAsync(cancellationToken: cancellationToken);
        if (userId is null)
        {
            return ServiceResult<IReadOnlyList<MissionDto>>.Ok(Array.Empty<MissionDto>());
        }

        var missions = await _missionRepository.GetAllByUserAsync(userId.Value, cancellationToken: cancellationToken);
        return ServiceResult<IReadOnlyList<MissionDto>>.Ok(missions.ToMissionDtoList());
    }

    public async Task<ServiceResult<MissionDto>> CreateAsync(CreateMissionRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return ServiceResult<MissionDto>.BadRequest("Dados da missão são obrigatórios.", "INVALID_REQUEST");
        }

        if (!request.IsAmaterasu)
        {
            var userId = await _missionRepository.GetDefaultUserIdAsync(cancellationToken: cancellationToken);
            if (userId is null)
            {
                return ServiceResult<MissionDto>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
            }

            Mission mission;
            try
            {
                var nowUtc = DateTime.UtcNow;
                var today = DateOnly.FromDateTime(nowUtc);
                mission = Mission.Create(
                    userId.Value,
                    request.Title,
                    request.Description,
                    request.Rank,
                    request.EstimatedMinutes,
                    isAmaterasu: false,
                    userAlreadyHasAmaterasuToday: false,
                    today,
                    nowUtc);
            }
            catch (DomainException ex)
            {
                return ServiceResult<MissionDto>.BadRequest(ex.Message, ex.Code);
            }

            var created = await _missionRepository.CreateAsync(mission, cancellationToken: cancellationToken);
            return ServiceResult<MissionDto>.Ok(created.ToMissionDto());
        }

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            // Serialize per-user Amaterasu activations in lock order (user_profiles -> missions).
            var lockedUserId = await _missionRepository.GetDefaultUserIdAsync(
                connection,
                transaction,
                forUpdate: true,
                cancellationToken: cancellationToken);

            if (lockedUserId is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ServiceResult<MissionDto>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
            }

            var nowUtc = DateTime.UtcNow;
            var today = DateOnly.FromDateTime(nowUtc);
            var hasAmaterasuToday = await _missionRepository.HasActiveAmaterasuOnDateAsync(
                lockedUserId.Value,
                today,
                excludeMissionId: null,
                connection,
                transaction,
                cancellationToken);

            var amaterasuMission = Mission.Create(
                lockedUserId.Value,
                request.Title,
                request.Description,
                request.Rank,
                request.EstimatedMinutes,
                isAmaterasu: true,
                userAlreadyHasAmaterasuToday: hasAmaterasuToday,
                today,
                nowUtc);

            var createdAmaterasu = await _missionRepository.CreateAsync(
                amaterasuMission,
                connection,
                transaction,
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return ServiceResult<MissionDto>.Ok(createdAmaterasu.ToMissionDto());
        }
        catch (DomainException ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ServiceResult<MissionDto>.BadRequest(ex.Message, ex.Code);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ServiceResult<MissionDto>> UpdateAsync(Guid id, UpdateMissionRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return ServiceResult<MissionDto>.BadRequest("Dados da missão são obrigatórios.", "INVALID_REQUEST");
        }

        var userId = await _missionRepository.GetDefaultUserIdAsync(cancellationToken: cancellationToken);
        if (userId is null)
        {
            return ServiceResult<MissionDto>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
        }

        var mission = await _missionRepository.GetByIdAsync(id, cancellationToken: cancellationToken);
        if (mission is null || mission.UserId != userId.Value)
        {
            return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
        }

        try
        {
            mission.UpdateDetails(request.Title, request.Description, request.Rank, request.EstimatedMinutes);
        }
        catch (DomainException ex)
        {
            return ServiceResult<MissionDto>.BadRequest(ex.Message, ex.Code);
        }

        var updated = await _missionRepository.UpdateAsync(mission, cancellationToken: cancellationToken);
        if (updated is null)
        {
            return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
        }

        return ServiceResult<MissionDto>.Ok(updated.ToMissionDto());
    }

    public async Task<ServiceResult<MissionDto>> UpdateStatusAsync(Guid id, UpdateMissionStatusRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return ServiceResult<MissionDto>.BadRequest("Dados de status são obrigatórios.", "INVALID_REQUEST");
        }

        var userId = await _missionRepository.GetDefaultUserIdAsync(cancellationToken: cancellationToken);
        if (userId is null)
        {
            return ServiceResult<MissionDto>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
        }

        var mission = await _missionRepository.GetByIdAsync(id, cancellationToken: cancellationToken);
        if (mission is null || mission.UserId != userId.Value)
        {
            return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
        }

        try
        {
            mission.ChangeStatus(request.Status, DateTime.UtcNow);
        }
        catch (DomainException ex)
        {
            return ServiceResult<MissionDto>.BadRequest(ex.Message, ex.Code);
        }

        var updated = await _missionRepository.UpdateStatusAsync(
            mission.Id,
            userId.Value,
            mission.Status,
            mission.CompletedAt,
            cancellationToken: cancellationToken);

        if (updated is null)
        {
            return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
        }

        return ServiceResult<MissionDto>.Ok(updated.ToMissionDto());
    }

    public async Task<ServiceResult<MissionDto>> ToggleAmaterasuAsync(
        Guid id,
        ToggleAmaterasuRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            // Lock profile first so daily Amaterasu validation + update execute atomically without deadlock risk.
            var userId = await _missionRepository.GetDefaultUserIdAsync(
                connection,
                transaction,
                forUpdate: true,
                cancellationToken: cancellationToken);

            if (userId is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ServiceResult<MissionDto>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
            }

            var mission = await _missionRepository.GetByIdAsync(id, connection, transaction, cancellationToken);
            if (mission is null || mission.UserId != userId.Value)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var requestedState = request?.IsAmaterasu;
            var targetIsAmaterasu = requestedState ?? !mission.IsAmaterasu;
            var otherAmaterasuExistsToday = targetIsAmaterasu && await _missionRepository.HasActiveAmaterasuOnDateAsync(
                userId.Value,
                today,
                excludeMissionId: mission.Id,
                connection,
                transaction,
                cancellationToken);

            var (isAmaterasu, amaterasuDate) = mission.DetermineAmaterasuToggle(
                requestedState,
                otherAmaterasuExistsToday,
                today);

            var updated = await _missionRepository.SetAmaterasuAsync(
                mission.Id,
                userId.Value,
                isAmaterasu,
                amaterasuDate,
                connection,
                transaction,
                cancellationToken);

            if (updated is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ServiceResult<MissionDto>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
            }

            await transaction.CommitAsync(cancellationToken);
            return ServiceResult<MissionDto>.Ok(updated.ToMissionDto());
        }
        catch (DomainException ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ServiceResult<MissionDto>.BadRequest(ex.Message, ex.Code);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = await _missionRepository.GetDefaultUserIdAsync(cancellationToken: cancellationToken);
        if (userId is null)
        {
            return ServiceResult<bool>.NotFound(ProfileNotFoundMessage, ProfileNotFoundCode);
        }

        var deleted = await _missionRepository.DeleteAsync(id, userId.Value, cancellationToken: cancellationToken);
        if (!deleted)
        {
            return ServiceResult<bool>.NotFound(MissionNotFoundMessage, MissionNotFoundCode);
        }

        return ServiceResult<bool>.Ok(true);
    }
}
