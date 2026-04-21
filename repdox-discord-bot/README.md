# Repdox Discord Bot

This bot handles user account linking, team role management, and server moderation for the Repdox platform.

## Features

- **/link [code]**: Links a Discord account to a Repdox website account using the code generated in the user profile.
- **/sync**: Automatically creates or assigns Discord roles based on the user's registered team names in Supabase.
- **/kick /ban**: Basic moderation tools for server administrators.

## Setup

1. **Discord Developer Portal**:
   - Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
   - Go to **Bot** section and get your **Token**.
   - Enable **Server Members Intent** and **Message Content Intent** in the Bot tab.
   - Go to **OAuth2** -> **General** to get your **Client ID**.

2. **Environment Variables**:
   Create a `.env` file in this directory with:
   ```env
   DISCORD_TOKEN=your_token_here
   CLIENT_ID=your_client_id_here
   SUPABASE_URL=https://igghkfselpqlyktsiulj.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Installation**:
   ```bash
   npm install
   ```

4. **Running**:
   ```bash
   npm start
   ```

## Database Support
Make sure to run the migration `supabase/migrations/20260421_add_discord_columns.sql` in your Supabase dashboard to add the necessary Discord columns to the `user_profiles` table.
