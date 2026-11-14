namespace TsukuyomiFocus.Application.DTOs;

public class IzanagiStateDto
{
    public bool LeftEyeBlind { get; set; }
    public bool RightEyeBlind { get; set; }
    public int RestorationRequiredMinutes { get; set; }
    public int RestorationProgressMinutes { get; set; }
    public string? LastUsedDate { get; set; }
    public int TotalTimesUsed { get; set; }
}

public class ProfileDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = "Uchiha";
    public int TotalChakra { get; set; }
    public int TotalFocusMinutes { get; set; }
    public string CurrentEyeStage { get; set; } = "normal";
    public string EquippedEyeStage { get; set; } = "normal";
    public string MangekyouVariant { get; set; } = "itachi";
    public string? CustomEyeImageUrl { get; set; }
    public int VisualBlurLevel { get; set; }
    public int CurrentStreak { get; set; }
    public int BestStreak { get; set; }
    public string? LastFocusDate { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AppStateResponseDto
{
    public ProfileDto Profile { get; set; } = new();
    public IzanagiStateDto Izanagi { get; set; } = new();
    public IReadOnlyList<MissionDto> Missions { get; set; } = [];
    public IReadOnlyList<FocusSessionLogDto> RecentLogs { get; set; } = [];
    public bool AmaterasuPenaltyApplied { get; set; }
    public int AmaterasuPenaltyChakra { get; set; }
    public IReadOnlyList<string> ExpiredAmaterasuMissions { get; set; } = [];
}

public class DailyCheckResponseDto
{
    public bool AmaterasuPenaltyApplied { get; set; }
    public int AmaterasuPenaltyChakra { get; set; }
    public IReadOnlyList<string> ExpiredAmaterasuMissions { get; set; } = [];
    public ProfileDto Profile { get; set; } = new();
}

public class EyeCustomizationRequest
{
    public string? EquippedEyeStage { get; set; }
    public string? MangekyouVariant { get; set; }
    public string? CustomEyeImageUrl { get; set; }
    public bool ClearCustomEyeImage { get; set; }
}

public class DevSimulateRequest
{
    public int? AddChakra { get; set; }
    public bool? UnlockAllEyes { get; set; }
    public bool? ResetBlindness { get; set; }
    public bool? SimulateLeftEyeBlind { get; set; }
    public bool? SimulateRightEyeBlind { get; set; }
    public int? SetVisualBlurLevel { get; set; }
    public int? SetCurrentStreak { get; set; }
}
