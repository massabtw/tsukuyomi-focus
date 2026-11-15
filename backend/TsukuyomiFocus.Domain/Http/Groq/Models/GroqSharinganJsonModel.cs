using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqSharinganJsonModel
{
    [JsonPropertyName("doujutsuName")]
    public string? DoujutsuName { get; set; }

    [JsonPropertyName("loreDescription")]
    public string? LoreDescription { get; set; }

    [JsonPropertyName("detectedMood")]
    public string? DetectedMood { get; set; }

    [JsonPropertyName("eyeCenterX")]
    public double? EyeCenterX { get; set; }

    [JsonPropertyName("eyeCenterY")]
    public double? EyeCenterY { get; set; }

    [JsonPropertyName("irisRadiusRatio")]
    public double? IrisRadiusRatio { get; set; }

    [JsonPropertyName("bladeCount")]
    public int? BladeCount { get; set; }

    [JsonPropertyName("patternType")]
    public string? PatternType { get; set; }

    [JsonPropertyName("primaryLineage")]
    public string? PrimaryLineage { get; set; }

    [JsonPropertyName("secondaryLineage")]
    public string? SecondaryLineage { get; set; }

    [JsonPropertyName("isEternalFusion")]
    public bool? IsEternalFusion { get; set; }

    [JsonPropertyName("primaryCrimsonHex")]
    public string? PrimaryCrimsonHex { get; set; }

    [JsonPropertyName("primaryGlowColor")]
    public string? PrimaryGlowColor { get; set; }

    [JsonPropertyName("secondaryDarkHex")]
    public string? SecondaryDarkHex { get; set; }

    [JsonPropertyName("hasAmaterasuFlames")]
    public bool? HasAmaterasuFlames { get; set; }

    [JsonPropertyName("rotationOffset")]
    public double? RotationOffset { get; set; }

    [JsonPropertyName("centerShape")]
    public string? CenterShape { get; set; }

    [JsonPropertyName("bladeStyle")]
    public string? BladeStyle { get; set; }

    [JsonPropertyName("outerRingStyle")]
    public string? OuterRingStyle { get; set; }

    [JsonPropertyName("customCenterElementsSvg")]
    public string? CustomCenterElementsSvg { get; set; }

    [JsonPropertyName("customSvgOverlay")]
    public string? CustomSvgOverlay { get; set; }

    [JsonPropertyName("ocularPowers")]
    public GroqOcularPowersJsonModel? OcularPowers { get; set; }

    [JsonPropertyName("svgCode")]
    public string? SvgCode { get; set; }
}
