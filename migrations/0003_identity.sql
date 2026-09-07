-- Replaces Auth0 with ASP.NET Core Identity.
--
-- Adds the four IdentityUserContext tables (no roles), links userProfile to them via a new
-- nullable identityUserId, and gives league a rotatable invite code.
--
-- NOTHING IS DELETED. Existing userProfile rows keep their playerId (and therefore their match
-- history); auth0Sub is merely relaxed to nullable so a profile can live without it. An existing
-- user re-registers with the same email and is re-linked lazily on their first authenticated
-- request (see ProfileResolver).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/****** AspNetUsers ******/
IF OBJECT_ID('[dbo].[AspNetUsers]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AspNetUsers](
        [Id]                   [nvarchar](450) NOT NULL,
        [UserName]             [nvarchar](256) NULL,
        [NormalizedUserName]   [nvarchar](256) NULL,
        [Email]                [nvarchar](256) NULL,
        [NormalizedEmail]      [nvarchar](256) NULL,
        [EmailConfirmed]       [bit] NOT NULL,
        [PasswordHash]         [nvarchar](max) NULL,
        [SecurityStamp]        [nvarchar](max) NULL,
        [ConcurrencyStamp]     [nvarchar](max) NULL,
        [PhoneNumber]          [nvarchar](max) NULL,
        [PhoneNumberConfirmed] [bit] NOT NULL,
        [TwoFactorEnabled]     [bit] NOT NULL,
        [LockoutEnd]           [datetimeoffset](7) NULL,
        [LockoutEnabled]       [bit] NOT NULL,
        [AccessFailedCount]    [int] NOT NULL,
     CONSTRAINT [PK_AspNetUsers] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    CREATE UNIQUE INDEX [UserNameIndex] ON [dbo].[AspNetUsers]([NormalizedUserName])
        WHERE [NormalizedUserName] IS NOT NULL;

    -- Unique rather than Identity's default non-unique index: we set RequireUniqueEmail = true,
    -- and the by-email re-link of old Auth0 profiles is only safe if an address maps to one account.
    CREATE UNIQUE INDEX [EmailIndex] ON [dbo].[AspNetUsers]([NormalizedEmail])
        WHERE [NormalizedEmail] IS NOT NULL;
END
GO

/****** AspNetUserClaims ******/
IF OBJECT_ID('[dbo].[AspNetUserClaims]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AspNetUserClaims](
        [Id]         [int] IDENTITY(1,1) NOT NULL,
        [UserId]     [nvarchar](450) NOT NULL,
        [ClaimType]  [nvarchar](max) NULL,
        [ClaimValue] [nvarchar](max) NULL,
     CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY CLUSTERED ([Id] ASC),
     CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY([UserId])
        REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [dbo].[AspNetUserClaims]([UserId]);
END
GO

/****** AspNetUserLogins (unused - no external providers - but part of the context) ******/
IF OBJECT_ID('[dbo].[AspNetUserLogins]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AspNetUserLogins](
        [LoginProvider]       [nvarchar](450) NOT NULL,
        [ProviderKey]         [nvarchar](450) NOT NULL,
        [ProviderDisplayName] [nvarchar](max) NULL,
        [UserId]              [nvarchar](450) NOT NULL,
     CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY CLUSTERED ([LoginProvider] ASC, [ProviderKey] ASC),
     CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY([UserId])
        REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [dbo].[AspNetUserLogins]([UserId]);
END
GO

/****** AspNetUserTokens ******/
IF OBJECT_ID('[dbo].[AspNetUserTokens]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AspNetUserTokens](
        [UserId]        [nvarchar](450) NOT NULL,
        [LoginProvider] [nvarchar](450) NOT NULL,
        [Name]          [nvarchar](450) NOT NULL,
        [Value]         [nvarchar](max) NULL,
     CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY CLUSTERED ([UserId] ASC, [LoginProvider] ASC, [Name] ASC),
     CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY([UserId])
        REFERENCES [dbo].[AspNetUsers]([Id]) ON DELETE CASCADE
    );
END
GO

/****** userProfile: link to Identity, relax auth0Sub ******/
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_userProfile_auth0Sub')
BEGIN
    ALTER TABLE [dbo].[userProfile] DROP CONSTRAINT [UQ_userProfile_auth0Sub];
END
GO

IF COL_LENGTH('[dbo].[userProfile]', 'auth0Sub') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[userProfile] ALTER COLUMN [auth0Sub] [nvarchar](255) NULL;
END
GO

IF COL_LENGTH('[dbo].[userProfile]', 'identityUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[userProfile] ADD [identityUserId] [nvarchar](450) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_userProfile_identityUser')
BEGIN
    ALTER TABLE [dbo].[userProfile] WITH CHECK
        ADD CONSTRAINT [FK_userProfile_identityUser] FOREIGN KEY([identityUserId])
        REFERENCES [dbo].[AspNetUsers]([Id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_userProfile_identityUserId')
BEGIN
    CREATE UNIQUE INDEX [UX_userProfile_identityUserId]
        ON [dbo].[userProfile]([identityUserId]) WHERE [identityUserId] IS NOT NULL;
END
GO

/****** league: rotatable invite code ******/
IF COL_LENGTH('[dbo].[league]', 'inviteCode') IS NULL
BEGIN
    ALTER TABLE [dbo].[league] ADD [inviteCode] [nvarchar](16) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_league_inviteCode')
BEGIN
    CREATE UNIQUE INDEX [UX_league_inviteCode]
        ON [dbo].[league]([inviteCode]) WHERE [inviteCode] IS NOT NULL;
END
GO
