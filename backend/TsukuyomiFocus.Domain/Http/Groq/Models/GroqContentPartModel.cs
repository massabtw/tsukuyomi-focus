using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqContentPartModel
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Text { get; set; }

    [JsonPropertyName("image_url")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public GroqImageUrlModel? ImageUrl { get; set; }
}
