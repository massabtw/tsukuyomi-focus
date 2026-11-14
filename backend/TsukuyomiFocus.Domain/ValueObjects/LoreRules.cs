using TsukuyomiFocus.Domain.Enums;

namespace TsukuyomiFocus.Domain.ValueObjects;

public readonly record struct RankRule(MissionRank Rank, string Code, double Multiplier, int SuggestedMinutes);

public static class LoreRules
{
    public const int BaseChakraPerMinute = 10;
    public const double AmaterasuMultiplier = 2.0;
    public const double SusanooMultiplier = 1.25;
    public const int AmaterasuPenaltyChakra = 300;
    public const int SusanooBreakPenaltyChakra = 150;
    public const int MaxVisualBlurLevel = 3;
    public const int IzanagiRestorationMinutes = 180;

    public static class Ranks
    {
        public const string D = "D";
        public const string C = "C";
        public const string B = "B";
        public const string A = "A";
        public const string S = "S";

        public static readonly IReadOnlyList<string> OrderedAscending = [D, C, B, A, S];

        public static readonly IReadOnlyDictionary<string, RankRule> Config =
            new Dictionary<string, RankRule>(StringComparer.Ordinal)
            {
                [D] = new(MissionRank.D, D, 1.0, 25),
                [C] = new(MissionRank.C, C, 1.2, 35),
                [B] = new(MissionRank.B, B, 1.5, 50),
                [A] = new(MissionRank.A, A, 2.0, 75),
                [S] = new(MissionRank.S, S, 3.0, 90)
            };

        public static bool IsValid(string? rank) =>
            !string.IsNullOrWhiteSpace(rank) && Config.ContainsKey(rank);
    }

    public static class MissionStatuses
    {
        public const string Todo = "todo";
        public const string InTsukuyomi = "in_tsukuyomi";
        public const string Completed = "completed";

        private static readonly HashSet<string> Valid = new(StringComparer.Ordinal)
        {
            Todo, InTsukuyomi, Completed
        };

        public static bool IsValid(string? status) =>
            !string.IsNullOrWhiteSpace(status) && Valid.Contains(status);
    }

    public static class EyeStages
    {
        public const string Normal = "normal";
        public const string Tomoe1 = "tomoe_1";
        public const string Tomoe2 = "tomoe_2";
        public const string Tomoe3 = "tomoe_3";
        public const string Mangekyou = "mangekyou";
        public const string Ems = "ems";
        public const string Rinnegan = "rinnegan";

        public static readonly IReadOnlyDictionary<string, int> Order =
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                [Normal] = (int)EyeStage.Normal,
                [Tomoe1] = (int)EyeStage.Tomoe1,
                [Tomoe2] = (int)EyeStage.Tomoe2,
                [Tomoe3] = (int)EyeStage.Tomoe3,
                [Mangekyou] = (int)EyeStage.Mangekyou,
                [Ems] = (int)EyeStage.Ems,
                [Rinnegan] = (int)EyeStage.Rinnegan
            };

        public static bool IsValid(string? stage) =>
            !string.IsNullOrWhiteSpace(stage) && Order.ContainsKey(stage);
    }

    public static class MangekyouVariants
    {
        public const string Itachi = "itachi";
        public const string Sasuke = "sasuke";
        public const string Shisui = "shisui";
        public const string Obito = "obito";
        public const string Madara = "madara";

        private static readonly HashSet<string> Valid = new(StringComparer.Ordinal)
        {
            Itachi, Sasuke, Shisui, Obito, Madara
        };

        public static bool IsValid(string? variant) =>
            !string.IsNullOrWhiteSpace(variant) && Valid.Contains(variant);
    }

    public static int CalculateSessionChakra(
        int durationMinutes,
        string? missionRank,
        bool isAmaterasu,
        bool wasSusanooActive)
    {
        if (durationMinutes <= 0)
        {
            return 0;
        }

        var rankMultiplier = !string.IsNullOrWhiteSpace(missionRank) &&
                             Ranks.Config.TryGetValue(missionRank, out var rankRule)
            ? rankRule.Multiplier
            : 1.0;

        var amaterasuMultiplier = isAmaterasu ? AmaterasuMultiplier : 1.0;
        var susanooMultiplier = wasSusanooActive ? SusanooMultiplier : 1.0;

        var raw = durationMinutes
                  * BaseChakraPerMinute
                  * rankMultiplier
                  * amaterasuMultiplier
                  * susanooMultiplier;

        return (int)Math.Round(raw, MidpointRounding.AwayFromZero);
    }

    public static string EvaluateEyeEvolution(
        string currentStage,
        int totalChakra,
        int totalFocusMinutes,
        int currentStreak)
    {
        var evaluatedStage = EyeStages.Normal;

        if (totalChakra >= 180_000 || totalFocusMinutes >= 18_000)
        {
            evaluatedStage = EyeStages.Rinnegan;
        }
        else if (totalChakra >= 72_000 || totalFocusMinutes >= 7_200)
        {
            evaluatedStage = EyeStages.Ems;
        }
        else if (totalChakra >= 24_000 || totalFocusMinutes >= 2_400 || currentStreak >= 7)
        {
            evaluatedStage = EyeStages.Mangekyou;
        }
        else if (totalChakra >= 12_000 || totalFocusMinutes >= 1_200)
        {
            evaluatedStage = EyeStages.Tomoe3;
        }
        else if (totalChakra >= 4_800 || totalFocusMinutes >= 480)
        {
            evaluatedStage = EyeStages.Tomoe2;
        }
        else if (totalChakra >= 1_200 || totalFocusMinutes >= 120)
        {
            evaluatedStage = EyeStages.Tomoe1;
        }

        var currentOrder = EyeStages.Order.GetValueOrDefault(currentStage, 0);
        var evaluatedOrder = EyeStages.Order.GetValueOrDefault(evaluatedStage, 0);

        return evaluatedOrder > currentOrder ? evaluatedStage : currentStage;
    }

    public static int GetHeatmapIntensityLevel(int minutes) => minutes switch
    {
        <= 0 => 0,
        <= 29 => 1,
        <= 59 => 2,
        <= 119 => 3,
        _ => 4
    };
}
