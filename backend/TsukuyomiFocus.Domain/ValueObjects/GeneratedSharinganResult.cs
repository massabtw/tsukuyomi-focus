namespace TsukuyomiFocus.Domain.ValueObjects;

public sealed record LeftEyePassiveValueObject
{
    public string Type { get; init; } = "CHAKRA_MULTIPLIER";
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public double BonusValue { get; init; } = 1.25;
}

public sealed record RightEyeActiveJutsuValueObject
{
    public string Type { get; init; } = "TSUKUYOMI_OVERDRIVE";
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public int CooldownCycles { get; init; } = 1;
}

public sealed record VisualThemeSignatureValueObject
{
    public string PrimaryGlowColor { get; init; } = "#DC2626";
    public string SecondaryColor { get; init; } = "#450A0A";
    public double AudioPitchRate { get; init; } = 1.0;
}

public sealed record OcularPowersValueObject
{
    public string Rarity { get; init; } = "Rank S";
    public LeftEyePassiveValueObject LeftEyePassive { get; init; } = new();
    public RightEyeActiveJutsuValueObject RightEyeActiveJutsu { get; init; } = new();
    public VisualThemeSignatureValueObject VisualThemeSignature { get; init; } = new();
}

public sealed record GeneratedSharinganResult
{
    public string DoujutsuName { get; init; } = string.Empty;
    public string LoreDescription { get; init; } = string.Empty;
    public string DetectedMood { get; init; } = string.Empty;
    public double EyeCenterX { get; init; } = 0.5;
    public double EyeCenterY { get; init; } = 0.5;
    public double IrisRadiusRatio { get; init; } = 0.22;
    public int BladeCount { get; init; } = 3;
    public string PatternType { get; init; } = "itachi_shuriken";
    public string PrimaryLineage { get; init; } = "itachi";
    public string? SecondaryLineage { get; init; }
    public bool IsEternalFusion { get; init; }
    public string CenterShape { get; init; } = "circle";
    public string BladeStyle { get; init; } = "curved_shuriken";
    public string OuterRingStyle { get; init; } = "tomoe_ring";
    public string? CustomSvgOverlay { get; init; }
    public string PrimaryCrimsonHex { get; init; } = "#DC2626";
    public string SecondaryDarkHex { get; init; } = "#450A0A";
    public bool HasAmaterasuFlames { get; init; }
    public double RotationOffset { get; init; }
    public string RawSvgCode { get; init; } = string.Empty;
    public string SvgDataUri { get; init; } = string.Empty;
    public string RasterImageUrl { get; init; } = string.Empty;
    public string PrimaryGlowColor { get; init; } = "#DC2626";
    public OcularPowersValueObject OcularPowers { get; init; } = new();
}
