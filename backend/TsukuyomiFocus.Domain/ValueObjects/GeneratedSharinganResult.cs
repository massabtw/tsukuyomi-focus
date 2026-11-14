namespace TsukuyomiFocus.Domain.ValueObjects;

public sealed record GeneratedSharinganResult
{
    public string DoujutsuName { get; init; } = string.Empty;
    public string LoreDescription { get; init; } = string.Empty;
    public string RawSvgCode { get; init; } = string.Empty;
    public string SvgDataUri { get; init; } = string.Empty;
    public string RasterImageUrl { get; init; } = string.Empty;
    public string PrimaryGlowColor { get; init; } = "#DC2626";
}
