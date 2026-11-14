using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqChoiceModel
{
    [JsonPropertyName("message")]
    public GroqChoiceMessageModel? Message { get; set; }
}
