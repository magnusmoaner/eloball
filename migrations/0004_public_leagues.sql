-- Opt-in public leagues.
--
-- Leagues are invite-only by default: the code is what keeps a stranger out. A public league is a
-- deliberate exception its owner turns on — listed for anyone signed in, and joinable without a
-- code. Existing leagues stay private.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('[dbo].[league]', 'isPublic') IS NULL
BEGIN
    ALTER TABLE [dbo].[league]
        ADD [isPublic] [bit] NOT NULL CONSTRAINT [DF_league_isPublic] DEFAULT (0);
END
GO
