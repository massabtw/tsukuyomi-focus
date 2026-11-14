using System.Globalization;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Entities;

namespace TsukuyomiFocus.Application.Mappers;

public static class SessionMapper
{
    private const string IsoDateFormat = "yyyy-MM-dd";

    public static FocusSessionLogDto ToSessionLogDto(this FocusSessionLog entity)
    {
        ArgumentNullException.ThrowIfNull(entity);

        return new FocusSessionLogDto
        {
            Id = entity.Id,
            MissionId = entity.MissionId,
            MissionTitle = entity.MissionTitle,
            Rank = entity.Rank,
            DurationMinutes = entity.DurationMinutes,
            ChakraEarned = entity.ChakraEarned,
            WasSusanooActive = entity.WasSusanooActive,
            WasCompleted = entity.WasCompleted,
            Date = entity.SessionDate.ToString(IsoDateFormat, CultureInfo.InvariantCulture),
            Timestamp = entity.CreatedAt
        };
    }

    public static CompleteSessionResponseDto ToCompleteResponseDto(
        this FocusSessionLog session,
        UserProfile profile,
        Mission? updatedMission,
        FocusSessionOutcome outcome)
    {
        ArgumentNullException.ThrowIfNull(session);
        ArgumentNullException.ThrowIfNull(profile);

        return new CompleteSessionResponseDto
        {
            Session = session.ToSessionLogDto(),
            Profile = profile.ToProfileDto(),
            Izanagi = profile.ToIzanagiDto(),
            UpdatedMission = updatedMission?.ToMissionDto(),
            ChakraEarned = outcome.ChakraEarned,
            UnlockedNewEyeStage = outcome.UnlockedNewEyeStage,
            NewEyeStage = outcome.NewEyeStage,
            EyeRestored = outcome.EyeRestored
        };
    }

    public static AbandonSessionResponseDto ToAbandonResponseDto(
        this FocusSessionLog session,
        UserProfile profile,
        bool izanagiInvoked,
        int chakraPenaltyApplied)
    {
        ArgumentNullException.ThrowIfNull(session);
        ArgumentNullException.ThrowIfNull(profile);

        return new AbandonSessionResponseDto
        {
            Session = session.ToSessionLogDto(),
            Profile = profile.ToProfileDto(),
            Izanagi = profile.ToIzanagiDto(),
            IzanagiInvoked = izanagiInvoked,
            ChakraPenaltyApplied = chakraPenaltyApplied
        };
    }

    public static IzanagiInvocationResponseDto ToIzanagiResponseDto(
        this UserProfile profile,
        string blindedEye,
        string message)
    {
        ArgumentNullException.ThrowIfNull(profile);

        return new IzanagiInvocationResponseDto
        {
            Profile = profile.ToProfileDto(),
            Izanagi = profile.ToIzanagiDto(),
            BlindedEye = blindedEye,
            Message = message
        };
    }
}
