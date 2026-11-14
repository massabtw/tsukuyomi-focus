using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqChatCompletionResponseModel
{
    [JsonPropertyName("choices")]
    public List<GroqChoiceModel> Choices { get; set; } = [];
}
