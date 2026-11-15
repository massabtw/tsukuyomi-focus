using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqOcularPowersJsonModel
{
    [JsonPropertyName("rarity")]
    public string? Rarity { get; set; }

    [JsonPropertyName("leftEyePassive")]
    public GroqLeftEyePassiveJsonModel? LeftEyePassive { get; set; }

    [JsonPropertyName("rightEyeActiveJutsu")]
    public GroqRightEyeActiveJutsuJsonModel? RightEyeActiveJutsu { get; set; }

    [JsonPropertyName("visualThemeSignature")]
    public GroqVisualThemeSignatureJsonModel? VisualThemeSignature { get; set; }
}
