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

public class GenerateSharinganRequestDto
{
    public string? Prompt { get; set; }
    public string? BaseEyeImageBase64 { get; set; }
    public string StyleVariant { get; set; } = "itachi";
    public string OutputFormat { get; set; } = "svg";
    public bool AutoEquip { get; set; } = true;
}

public class LeftEyePassiveDto
{
    public string Type { get; set; } = "CHAKRA_MULTIPLIER";
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double BonusValue { get; set; } = 1.25;
}

public class RightEyeActiveJutsuDto
{
    public string Type { get; set; } = "TSUKUYOMI_OVERDRIVE";
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CooldownCycles { get; set; } = 1;
}

public class VisualThemeSignatureDto
{
    public string PrimaryGlowColor { get; set; } = "#DC2626";
    public string SecondaryColor { get; set; } = "#450A0A";
    public double AudioPitchRate { get; set; } = 1.0;
}

public class OcularPowersDto
{
    public string Rarity { get; set; } = "Rank S";
    public LeftEyePassiveDto LeftEyePassive { get; set; } = new();
    public RightEyeActiveJutsuDto RightEyeActiveJutsu { get; set; } = new();
    public VisualThemeSignatureDto VisualThemeSignature { get; set; } = new();
}

public class GenerateSharinganResponseDto
{
    public string DoujutsuName { get; set; } = string.Empty;
    public string LoreDescription { get; set; } = string.Empty;
    public string DetectedMood { get; set; } = string.Empty;
    public double EyeCenterX { get; set; } = 0.5;
    public double EyeCenterY { get; set; } = 0.5;
    public double IrisRadiusRatio { get; set; } = 0.22;
    public int BladeCount { get; set; } = 3;
    public string PatternType { get; set; } = "itachi_shuriken";
    public string PrimaryLineage { get; set; } = "itachi";
    public string? SecondaryLineage { get; set; }
    public bool IsEternalFusion { get; set; }
    public string CenterShape { get; set; } = "circle";
    public string BladeStyle { get; set; } = "curved_shuriken";
    public string OuterRingStyle { get; set; } = "tomoe_ring";
    public string PrimaryCrimsonHex { get; set; } = "#DC2626";
    public string SecondaryDarkHex { get; set; } = "#450A0A";
    public bool HasAmaterasuFlames { get; set; }
    public double RotationOffset { get; set; }
    public string RawSvgCode { get; set; } = string.Empty;
    public string SvgDataUri { get; set; } = string.Empty;
    public string RasterImageUrl { get; set; } = string.Empty;
    public string PrimaryGlowColor { get; set; } = "#DC2626";
    public OcularPowersDto OcularPowers { get; set; } = new();
    public string EquippedImageUrl { get; set; } = string.Empty;
    public bool AutoEquipped { get; set; }
    public ProfileDto? Profile { get; set; }
}
