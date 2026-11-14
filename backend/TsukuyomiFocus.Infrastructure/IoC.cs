using Dapper;
using Microsoft.Extensions.DependencyInjection;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.Interfaces.Services;
using TsukuyomiFocus.Infrastructure.Http.Groq;
using TsukuyomiFocus.Infrastructure.Persistence;
using TsukuyomiFocus.Infrastructure.Repositories;

namespace TsukuyomiFocus.Infrastructure;

public static class IoC
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());

        services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
        services.AddTransient<DatabaseInitializer>();

        services.AddTransient<IProfileRepository, ProfileRepository>();
        services.AddTransient<IMissionRepository, MissionRepository>();
        services.AddTransient<ISessionRepository, SessionRepository>();
        services.AddTransient<IStatsRepository, StatsRepository>();

        services.ConfigureOptions<GroqOptionsSetup>();
        services.AddTransient<GroqAuthHandler>();
        services.AddHttpClient<ISharinganAiGeneratorService, GroqSharinganGeneratorService>(
                nameof(ISharinganAiGeneratorService),
                client => client.Timeout = TimeSpan.FromSeconds(45))
            .AddHttpMessageHandler<GroqAuthHandler>();

        return services;
    }
}
