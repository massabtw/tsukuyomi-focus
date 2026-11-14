using System.Globalization;
using TsukuyomiFocus.Application.DTOs;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Application.Mappers;

public static class ProfileMapper
{
    private const string IsoDateFormat = "yyyy-MM-dd";

    public static ProfileDto ToProfileDto(this UserProfile entity)
    {
        ArgumentNullException.ThrowIfNull(entity);

        return new ProfileDto
        {
            Id = entity.Id,
            Username = entity.Username,
            TotalChakra = entity.TotalChakra,
            TotalFocusMinutes = entity.TotalFocusMinutes,
            CurrentEyeStage = entity.CurrentEyeStage,
            EquippedEyeStage = entity.EquippedEyeStage,
            MangekyouVariant = entity.MangekyouVariant,
            CustomEyeImageUrl = entity.CustomEyeImageUrl,
            VisualBlurLevel = entity.VisualBlurLevel,
            CurrentStreak = entity.CurrentStreak,
            BestStreak = entity.BestStreak,
            LastFocusDate = FormatDate(entity.LastFocusDate),
            UpdatedAt = entity.UpdatedAt
        };
    }

    public static IzanagiStateDto ToIzanagiDto(this UserProfile entity)
    {
        ArgumentNullException.ThrowIfNull(entity);

        return new IzanagiStateDto
        {
            LeftEyeBlind = entity.LeftEyeBlind,
            RightEyeBlind = entity.RightEyeBlind,
            RestorationRequiredMinutes = entity.RestorationRequiredMinutes,
            RestorationProgressMinutes = entity.RestorationProgressMinutes,
            LastUsedDate = FormatDate(entity.LastIzanagiDate),
            TotalTimesUsed = entity.TotalIzanagiUsed
        };
    }

    public static AppStateResponseDto ToAppStateDto(
        this UserProfile profile,
        IReadOnlyList<Mission> missions,
        IReadOnlyList<FocusSessionLog> recentLogs,
        bool amaterasuPenaltyApplied = false,
        int amaterasuPenaltyChakra = 0,
        IReadOnlyList<string>? expiredAmaterasuMissions = null)
    {
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(missions);
        ArgumentNullException.ThrowIfNull(recentLogs);

        return new AppStateResponseDto
        {
            Profile = profile.ToProfileDto(),
            Izanagi = profile.ToIzanagiDto(),
            Missions = missions.Select(MapMissionDto).ToList(),
            RecentLogs = recentLogs.Select(MapFocusSessionLogDto).ToList(),
            AmaterasuPenaltyApplied = amaterasuPenaltyApplied,
            AmaterasuPenaltyChakra = amaterasuPenaltyChakra,
            ExpiredAmaterasuMissions = expiredAmaterasuMissions ?? Array.Empty<string>()
        };
    }

    public static DailyCheckResponseDto ToDailyCheckDto(
        this UserProfile profile,
        bool amaterasuPenaltyApplied = false,
        int amaterasuPenaltyChakra = 0,
        IReadOnlyList<string>? expiredAmaterasuMissions = null)
    {
        ArgumentNullException.ThrowIfNull(profile);

        return new DailyCheckResponseDto
        {
            AmaterasuPenaltyApplied = amaterasuPenaltyApplied,
            AmaterasuPenaltyChakra = amaterasuPenaltyChakra,
            ExpiredAmaterasuMissions = expiredAmaterasuMissions ?? Array.Empty<string>(),
            Profile = profile.ToProfileDto()
        };
    }

    public static GenerateSharinganResponseDto ToGenerateSharinganResponseDto(
        this GeneratedSharinganResult result,
        string equippedImageUrl,
        bool autoEquipped,
        UserProfile? profile = null)
    {
        ArgumentNullException.ThrowIfNull(result);

        return new GenerateSharinganResponseDto
        {
            DoujutsuName = result.DoujutsuName,
            LoreDescription = result.LoreDescription,
            RawSvgCode = result.RawSvgCode,
            SvgDataUri = result.SvgDataUri,
            RasterImageUrl = result.RasterImageUrl,
            PrimaryGlowColor = result.PrimaryGlowColor,
            EquippedImageUrl = equippedImageUrl,
            AutoEquipped = autoEquipped,
            Profile = profile?.ToProfileDto()
        };
    }

    private static MissionDto MapMissionDto(Mission entity) => new()
    {
        Id = entity.Id,
        Title = entity.Title,
        Description = entity.Description,
        Rank = entity.Rank,
        Status = entity.Status,
        EstimatedMinutes = entity.EstimatedMinutes,
        CompletedMinutes = entity.CompletedMinutes,
        CompletedCycles = entity.CompletedCycles,
        IsAmaterasu = entity.IsAmaterasu,
        AmaterasuDate = FormatDate(entity.AmaterasuDate),
        CreatedAt = entity.CreatedAt,
        CompletedAt = entity.CompletedAt
    };

    private static FocusSessionLogDto MapFocusSessionLogDto(FocusSessionLog entity) => new()
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

    private static string? FormatDate(DateOnly? date) =>
        date?.ToString(IsoDateFormat, CultureInfo.InvariantCulture);
}
