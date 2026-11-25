# HABITAT — Master Product & Technical Specification

## 1. Project Overview

Build **Habitat**, a responsive, cross-platform Progressive Web App (PWA) that combines:

- Habit tracking.
- Focus sessions and productivity.
- Tree planting and ecosystem building.
- Collectible plants, trees and wildlife.
- Multiple unlockable natural and fantasy biomes.
- Personal progression and achievements.
- Cloud synchronisation across devices.

The central concept is:

**Build a better life, one habit at a time, and watch your own world come alive.**

Habitat should feel like a cozy ecosystem-building game powered by real-life activities.

It should not feel like a conventional habit tracker with a decorative forest background. The ecosystem itself should be a meaningful reflection of the user's progress.

The application should work on:
- iPhone and iPad.
- Android phones and tablets.
- macOS.
- Windows.
- Linux.

It must be usable through a browser and installable as a PWA where supported.

The initial development should prioritise mobile usability while ensuring desktop compatibility from the beginning.

---

# 2. Technology Stack

Use the following technologies unless there is a compelling technical reason to recommend an alternative.

| Component | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build tool | Vite |
| Game rendering | Phaser 3 |
| Styling | CSS / CSS Grid / Flexbox |
| Local persistence | IndexedDB |
| Authentication | Supabase Auth |
| Cloud database | Supabase PostgreSQL |
| Cloud integration | @supabase/supabase-js |
| Hosting | GitHub Pages |
| PWA support | Vite PWA plugin or equivalent |

### Architectural principles

1. React handles application UI, navigation, habit management, account management, insights and settings.
2. Phaser handles the interactive habitat, biome rendering, world objects, animations and game interactions.
3. IndexedDB is the local persistence layer.
4. Supabase is the optional cloud synchronisation layer for authenticated users.
5. The application must remain usable without an internet connection.
6. Core game assets should be bundled locally rather than downloaded from external sources during gameplay.
7. Keep game logic, application logic, persistence and cloud synchronisation separate.

Do not introduce unnecessary backend servers, microservices or paid services.

---

# 3. Visual Identity and Art Direction

## Overall style

Use a cozy, detailed, whimsical 2D pixel-art aesthetic.

Reference the visual appeal of:
- Stardew Valley.
- Eastward.
- Cozy pixel-art management games.
- Forest's tree collection and focus-session planting concept.

However, Habitat should have its own visual identity.

### Art direction

- Elevated top-down or slightly isometric perspective.
- Consistent pixel density.
- Natural, earthy colour palette.
- Detailed environmental tiles.
- Distinctive silhouettes for individual tree species.
- Gentle ambient animations.
- Visually appealing day/night transitions where appropriate.
- Calm and relaxing atmosphere.

### Pixel-art requirements

- Use nearest-neighbour scaling.
- Avoid blurry scaling and anti-aliased pixel edges.
- Maintain consistent sprite dimensions and proportions.
- Prefer reusable sprites and tilesets.
- Avoid using emoji as substitutes for game assets.
- Do not use generic smooth vector illustrations as substitutes for pixel art.
- Do not use one large static AI-generated background image as the entire game environment.
- Individual trees, plants, animals, terrain and objects must be reusable assets.

Use a consistent palette for the initial woodland, with appropriate separate palettes for future biomes.

Create an asset library that can be expanded as development progresses.

If suitable original assets cannot be produced immediately, create coherent temporary placeholder sprites. Do not mix unrelated visual styles.

---

# 4. Application Navigation

Use the following primary navigation:

1. Habitat
2. Growth
3. Focus
4. Challenges
5. Collection
6. Insights

On mobile, use bottom navigation.

On desktop, use a persistent left sidebar.

On tablets, adapt the layout according to available space.

### Habitat

The main interactive ecosystem.

Users can:
- View their currently selected biome.
- See planted trees and other ecosystem objects.
- Interact with plants and wildlife.
- Switch between unlocked biomes.
- Access a world overview.
- View their overall progression.

### Growth

Manage positive habits.

Examples:
- Exercise.
- Reading.
- Drinking water.
- Meditation.
- Learning.
- Sleep routines.
- Practising a musical instrument.

Users should be able to:
- Create, edit and archive habits.
- Configure frequency and targets.
- Record daily completions.
- View completion history.
- Track streaks and progress.
- Review rewards earned.

Support daily, weekly and custom schedules where practical.

### Focus

A dedicated focus timer.

Users can:
- Select a duration.
- Choose a tree species to plant.
- Start, pause and resume a focus session.
- View elapsed and remaining time.
- Complete a session.
- Review their focus history.

Suggested preset durations:
- 15 minutes.
- 25 minutes.
- 45 minutes.
- 60 minutes.
- Custom duration.

The focus experience should be simple and visually appealing.

### Challenges

Manage behaviours the user wants to reduce or control.

Examples:
- Excessive screen time.
- Smoking.
- Procrastination.
- Impulse spending.
- Excessive snacking.
- Late-night scrolling.
- Excessive gaming.

Avoid judgemental terminology. Treat these as personal challenges rather than moral failures.

Support three tracking modes:

1. Avoidance: Did the user avoid the behaviour today?
2. Frequency: How many times did the behaviour occur?
3. Duration: How many minutes were spent on the behaviour?

For Screen Time, allow manual entry of daily usage and a user-defined target.

Do not claim that an ordinary iPhone PWA can directly retrieve Apple Screen Time statistics. Native iOS frameworks would be required for that level of integration.

### Collection

A collection library containing:

- Tree species.
- Plants and flowers.
- Mushrooms.
- Wildlife.
- Decorations.
- Biomes.
- Rare discoveries.

Display locked and unlocked items.

Show discovery requirements and relevant descriptions.

### Insights

Provide meaningful summaries of the user's progress.

Examples:
- Habit completion rates.
- Focus hours.
- Total completed focus sessions.
- Trees planted.
- Species discovered.
- Biomes unlocked.
- Challenge progress.
- Historical trends.

Use clear charts and avoid overwhelming the user with unnecessary statistics.

---

# 5. Core Gamification System

Habitat should have a coherent progression system.

Suggested currencies and progression indicators:

### Nature Energy (NE)

Earned through positive activities.

Can be used for:
- Decorations.
- Cosmetic objects.
- Habitat customisation.
- Optional ecosystem enhancements.

Do not make essential progression excessively dependent on currency.

### Discovery Points

Earned through milestones and exploration.

Used to unlock:
- New species.
- Rare discoveries.
- Biome-related rewards.
- Special decorations.

### Biodiversity

Represents the variety of species discovered in the user's ecosystem.

It should be an achievement indicator rather than a punitive score.

### Ecosystem Health

An optional summary of recent activity.

It should reflect positive progress and challenge management without making the user feel punished for missing a day.

Do not allow one category with many habits to overwhelm another category when calculating scores.

---

# 6. Focus Sessions and Permanent Tree Planting

This is one of Habitat's most important features.

Use Forest as a reference for the concept of planting a tree through a focus session, but develop an original implementation.

## Focus session workflow

1. User opens Focus.
2. User chooses a duration.
3. User selects an unlocked tree species.
4. User starts the session.
5. A visual representation of the selected tree grows during the session.
6. When the session is successfully completed, a permanent tree is planted in the selected biome.
7. The user receives appropriate progression rewards.
8. The completed session is recorded permanently.

Each completed session should create a separate tree.

For example:

- Session 1: Oak.
- Session 2: Pine.
- Session 3: Cherry Blossom.
- Session 4: Birch.

The user's woodland gradually becomes a record of their focus history.

## Tree selection

The selected species determines which tree is planted.

Do not randomly select the tree after a session.

Users should be able to choose from their unlocked species before starting a session.

## Tree growth stages

Each species should support multiple growth stages.

Suggested stages:

1. Seed.
2. Sprout.
3. Sapling.
4. Young tree.
5. Mature tree.

A session can visually progress through these stages.

The final planted tree should retain its species and completed growth stage.

## Interrupted sessions

Do not destroy existing trees or permanently penalise users.

If a focus session is interrupted:
- Record its status appropriately.
- Preserve the session history.
- Do not grant a completed-session tree unless completion criteria are met.
- Do not punish users with permanent environmental damage.

## Timer implementation

iOS PWAs may be suspended when backgrounded.

Therefore:
- Calculate elapsed time using timestamps.
- Do not depend on JavaScript setInterval continuing to run in the background.
- Recalculate the timer when the application resumes.
- Handle page refreshes and temporary interruptions.
- Persist active session state locally.

Use unique session IDs so that a completed session cannot accidentally produce multiple trees during synchronisation retries.

---

# 7. Tree Species and Collection

Build a data-driven tree species system.

Each species should define:
- Unique species ID.
- Display name.
- Description.
- Biome availability.
- Unlock requirement.
- Sprite references.
- Growth stages.
- Optional rarity.
- Optional seasonal variations.

Initial Woodland Sanctuary species could include:

1. Oak.
2. Pine.
3. Birch.
4. Maple.
5. Willow.
6. Cherry Blossom.
7. Ginkgo.
8. Cedar.
9. Magnolia.
10. Redwood.
11. Silver Birch.
12. Golden Oak.

The initial list does not need to be completely implemented at once.

Different species must have distinct silhouettes and visual characteristics. Do not simply recolour one generic tree sprite.

Users should gradually unlock additional species through:
- Completed focus sessions.
- Total focus hours.
- Total trees planted.
- Collection milestones.
- Special achievements.

Avoid making all species available immediately.

---

# 8. Woodland and Permanent Tree Storage

The Woodland Sanctuary is the user's starting environment.

Every successfully completed focus session permanently adds one tree to the user's ecosystem.

The woodland should eventually contain all trees planted by the user.

## Woodland expansion

Avoid imposing one global tree limit.

Instead, organise the environment into multiple areas.

For example:

- Woodland Clearing.
- Oak Grove.
- Pine Ridge.
- Blossom Garden.
- Ancient Woodland.

Each area should have a configurable capacity or comfortable visual density.

When an area becomes crowded:
- Automatically unlock or expand another area when appropriate.
- Allow the user to revisit existing areas.
- Never delete or discard previously planted trees.
- Preserve every tree record.

Initial capacity targets can be used as design guidance, but they should be configurable rather than hardcoded limitations.

For example:
- Initial clearing: approximately 12 trees.
- Additional groves: approximately 20–30 trees each.

The actual number should be adjusted based on the visual density and performance of the environment.

## Tree records

Each planted tree should have:
- Unique ID.
- Species ID.
- Biome ID.
- Area ID.
- Planting date.
- Growth stage.
- Position.
- Associated focus session ID.

Users should eventually be able to:
- Move trees.
- Rearrange their environment.
- Create clearings.
- Place decorations.
- Add paths and ponds.

Prioritise automatic placement initially. Manual rearrangement can be introduced later.

## Forest overview

Provide a miniature overview of all unlocked areas.

Users should be able to see how their woodland has expanded without rendering every tree at full detail simultaneously.

---

# 9. Multiple Biomes and Future World Expansion

Habitat should eventually become a collection of distinct natural and fantasy biomes.

This is a major part of the long-term product vision.

Do not hardcode the application around Woodland Sanctuary.

Build a reusable biome configuration system from the beginning.

Each biome should define:
- Unique ID.
- Name and description.
- Unlock requirements.
- Terrain tileset.
- Background and environmental palette.
- Available tree species.
- Available plants and flowers.
- Wildlife species.
- Environmental effects.
- Decorations.
- Areas and expansion rules.
- Optional weather and seasonal settings.

## Planned biome progression

The following is the intended long-term direction.

### Biome 1: Woodland Sanctuary

Starting biome.

Visual identity:
- Green grass.
- Dirt paths.
- Oak and pine trees.
- Flowers.
- Ferns.
- Mushrooms.
- Small ponds.
- Rabbits.
- Squirrels.
- Birds.
- Butterflies.

### Biome 2: Frozen Tundra

Visual identity:
- Snow-covered terrain.
- Snowy pine trees.
- Frozen lakes.
- Ice formations.
- Snow-covered mountains.
- Snow hares.
- Arctic foxes.
- Reindeer.

### Biome 3: Golden Savannah

Visual identity:
- Golden grass.
- Acacia trees.
- Baobab trees.
- Dry terrain.
- Watering holes.
- Elephants.
- Giraffes.
- Zebras.
- Lions.

### Biome 4: Whispering Marsh

Visual identity:
- Murky water.
- Weeping willows.
- Lily pads.
- Reeds.
- Mangroves.
- Glowing mushrooms.
- Frogs.
- Fireflies.
- Herons.

### Biome 5: Skybound Peaks

Fantasy biome.

Visual identity:
- Floating islands.
- Suspended waterfalls.
- Clouds.
- Mountain vegetation.
- Unusual floating trees.
- Crystal formations.
- Sky creatures.
- Bridges between islands.

### Biome 6: Enchanted Fairy Forest

Fantasy biome.

Visual identity:
- Giant luminous trees.
- Glowing mushrooms.
- Bioluminescent flowers.
- Magical crystals.
- Fairy lights.
- Unusual plants.
- Fantasy wildlife.
- Magical environmental effects.

## Additional future biomes

Consider these for future expansion:

- Coral Reef.
- Autumn Highlands.
- Volcanic Wilderness.
- Crystal Caverns.
- Tropical Rainforest.
- Desert Oasis.
- Ancient Ruins.
- Celestial Gardens.

These are future possibilities, not requirements for the initial release.

## Biome unlocking

Use total planted trees as the primary progression mechanism.

Illustrative thresholds:

| Total planted trees | Biome |
|---:|---|
| 0 | Woodland Sanctuary |
| 15 | Frozen Tundra |
| 35 | Golden Savannah |
| 60 | Whispering Marsh |
| 90 | Skybound Peaks |
| 130 | Enchanted Fairy Forest |

These values should be configurable in biome data rather than embedded throughout application logic.

Additional species and decorations can have their own requirements.

## Planting across biomes

When a user unlocks a new biome:
1. The biome becomes accessible from the world overview.
2. The user can explore it.
3. The user can discover its available species.
4. The user can select a species before starting a focus session.
5. Completing the session permanently plants the selected species in that biome.

Previously planted trees must remain in their original biomes.

## World overview

Eventually provide an interactive miniature world map showing all unlocked biomes.

The map should communicate the user's overall progression and provide navigation between environments.

---

# 10. Wildlife and Ecosystem Interactions

Introduce wildlife gradually.

Examples:
- Flowers attract butterflies.
- Mature trees attract birds.
- Ponds attract frogs.
- Dense woodland attracts rabbits and squirrels.
- Savannah watering holes attract larger animals.
- Marsh vegetation attracts frogs and herons.
- Fantasy biomes attract mythical creatures.

Wildlife should be discoverable and collectible.

Use environmental conditions and species combinations to encourage exploration.

For example:
- Planting several flowers may attract a rare butterfly.
- Developing a mature pond may attract frogs.
- Planting a collection of cherry blossom trees may unlock a special discovery.

Do not make these systems overly complicated in the first release.

---

# 11. Positive Habits and Challenges

Positive habits should contribute to ecosystem growth.

Challenges should provide opportunities for reflection and recovery.

Examples of positive habit rewards:

| Activity | Example reward |
|---|---:|
| Exercise | 25 NE |
| Reading | 15 NE |
| Drinking water | 10 NE |
| Sleep routine | 20 NE |
| Learning | 20 NE |
| Meditation | 15 NE |

These are initial balancing values.

## Challenge-related environmental effects

Challenges may introduce temporary cosmetic environmental effects.

Examples:
- Excessive distraction: temporary forest fog.
- Procrastination: overgrown vines.
- Neglected self-care: drooping flowers.
- Excessive screen time: murky pond effects.

These effects must be gradual and recoverable.

Never:
- Kill planted trees.
- Delete unlocked species.
- Remove purchased decorations.
- Erase accumulated progress.
- Destroy the user's ecosystem due to missed habits.

Recovery should be achievable through normal positive activities.

Preserve historical records even when users miss their targets.

The overall experience should encourage consistency without guilt or punishment.

---

# 12. Responsive Mobile and Desktop Design

Cross-platform support is a core requirement.

Do not build a mobile-only interface and attempt to retrofit desktop support later.

## Mobile

Optimise for iPhone first.

Requirements:
- Bottom navigation.
- Touch-friendly controls.
- Appropriate touch target sizes.
- Responsive cards and panels.
- Safe-area insets.
- Full-screen or near-full-screen habitat experience.
- Swipe-friendly biome selection where appropriate.
- Compact focus timer.
- Support portrait orientation.

## Desktop

Requirements:
- Persistent left sidebar.
- Larger habitat viewport.
- Expanded dashboards.
- Multi-column collection layouts.
- Mouse interaction.
- Keyboard support for appropriate actions.
- More visible information without excessive scrolling.

## Tablet

Use an adaptive layout between mobile and desktop.

## Phaser viewport

The Phaser environment must:
- Adapt to viewport size and aspect ratio.
- Preserve sprite proportions.
- Use nearest-neighbour rendering.
- Support touch and mouse interactions.
- Support panning and zooming for larger areas.
- Avoid rendering off-screen areas unnecessarily.
- Keep application controls outside the game canvas where practical.

Do not distort the world simply to fill the screen.

The same account and ecosystem should work consistently across all devices.

---

# 13. Local Persistence and Data Architecture

Use IndexedDB for persistent local application data.

Do not use localStorage as the primary database.

Organise the local data model around entities such as:

- Habits.
- Habit schedules.
- Habit completions.
- Challenges.
- Challenge records.
- Focus sessions.
- Tree species.
- Planted trees.
- Biomes.
- Biome areas.
- Plants.
- Wildlife discoveries.
- Inventory.
- Decorations.
- Ecosystem progression.
- Achievements.
- User preferences.
- Synchronisation queue.

Use UUIDs for persistent records.

Separate application configuration and static species definitions from user-owned data.

Static data such as tree species, biome definitions, unlock rules and sprite references should be stored in version-controlled JSON or TypeScript configuration files.

Do not store actual sprite images in Supabase.

Store only the state required to reconstruct the ecosystem:
- Biome ID.
- Area ID.
- Species ID.
- Object ID.
- Position.
- Growth stage.
- Unlock state.

The actual game assets should remain bundled with the frontend.

## Manual backup

Provide:
- JSON export.
- JSON import.
- Backup validation.
- Clear confirmation before replacing existing local data.
- Appropriate handling of imported IDs and duplicate records.

Manual backup must remain available even after Supabase integration.

---

# 14. Supabase Integration — Recommended Development Sequence

Supabase should be used as the shared cloud backend for Habitat and potentially other applications such as Magpie.

Important architectural decision:

**Use one Supabase project for multiple PWAs, but keep each application's data and implementation independent.**

There is no requirement to create a separate backend server or separate GitHub backend repository.

For Habitat:
- Keep Supabase migrations in this repository.
- Use Habitat-specific table names.
- Keep Habitat-specific authentication UI and synchronisation code in this repository.
- Do not modify Magpie's tables or application code.

For Magpie:
- It can independently connect to the same Supabase project.
- Its own tables and policies should use a separate namespace, such as `magpie_`.
- Both applications can use the same Supabase Auth user accounts.

## Phase A: Local-first foundation

Implement the complete local data architecture first.

Requirements:
- IndexedDB persistence.
- UUID-based records.
- Clear entity relationships.
- Timestamps for created and updated records.
- A consistent data-access layer.
- A synchronisation-ready model.
- Unique IDs for focus sessions and planted trees.

Do not require authentication at this stage.

However, design the records so they can later be associated with a Supabase Auth user ID.

## Phase B: Supabase project and authentication

After the local application is functional, integrate Supabase.

Use:
- `@supabase/supabase-js`.
- Supabase Auth.
- PostgreSQL.
- Row Level Security (RLS).

Initial authentication features:
- Email and password registration.
- Login.
- Logout.
- Password reset.
- Persistent sessions.
- Account settings.
- Guest mode.

Google sign-in can be added if practical. Apple sign-in can be considered later.

Use environment variables:

`VITE_SUPABASE_URL`

`VITE_SUPABASE_PUBLISHABLE_KEY`

Never expose the Supabase service-role key in frontend code.

Configure GitHub Pages URLs and allowed authentication redirect URLs.

## Phase C: Database schema and security

Create Habitat-specific tables.

Suggested initial tables:

- `habitat_profiles`
- `habitat_habits`
- `habitat_habit_completions`
- `habitat_challenges`
- `habitat_challenge_records`
- `habitat_focus_sessions`
- `habitat_planted_trees`
- `habitat_biome_progress`
- `habitat_inventory`
- `habitat_discoveries`
- `habitat_user_settings`

All user-owned tables must have an appropriate `user_id` associated with the authenticated Supabase Auth user.

Implement RLS policies that ensure:
- Users can read their own records.
- Users can insert their own records.
- Users can update their own records.
- Users cannot read or modify another user's data.
- Unauthenticated users cannot access private cloud records.

Do not rely on frontend checks for security.

Test RLS using multiple test accounts.

Avoid creating shared tables unnecessarily. The `auth.users` identity is the common authentication source; Habitat should maintain its own application-specific data.

## Phase D: Guest-to-account migration

Guest mode must remain fully usable.

When a guest creates an account:
- Preserve existing habits.
- Preserve completion history.
- Preserve focus sessions.
- Preserve all planted trees.
- Preserve unlocked species.
- Preserve biome progression.
- Preserve inventory and discoveries.

Migrate the local records into the authenticated user's cloud account.

If the destination account already contains data, do not silently overwrite it.

Provide an appropriate merge or replacement decision.

Validate that the migration succeeds before marking the data as synchronised.

## Phase E: Local-first cloud synchronisation

Keep IndexedDB as the immediate local data source.

Expected behaviour:

1. User makes a change.
2. Save it to IndexedDB immediately.
3. Add the change to a synchronisation queue.
4. When online, upload pending changes.
5. Download relevant cloud changes.
6. Update the local database.
7. Update the sync status.

The application must remain usable offline.

Requirements:
- Unique operation IDs.
- Idempotent uploads.
- Retry handling.
- Sync timestamps.
- Conflict detection.
- Conflict resolution.
- Duplicate prevention.
- Appropriate error handling.
- Clear sync status indicators.

Do not make normal UI interactions wait for a network request.

Be especially careful with focus sessions and tree planting. A retry must never award the same completed session twice.

Use unique constraints and appropriate database-side safeguards where necessary.

For concurrent updates:
- Define conflict rules for different entity types.
- Avoid blindly using last-write-wins for all records.
- Preserve historical completion and focus records.
- Avoid overwriting newer cloud state with stale local data.

## Phase F: Multi-device testing

Test at least two devices or browser sessions.

Example:
1. Log into Habitat on desktop.
2. Complete a focus session.
3. Plant an Oak.
4. Open Habitat on iPhone.
5. Confirm that the focus session, tree and progression are synchronised.
6. Make an offline change on the iPhone.
7. Reconnect and confirm synchronisation.
8. Test duplicate prevention and conflict handling.

Only consider cloud synchronisation complete once these scenarios work reliably.

---

# 15. PWA Requirements

Habitat should be installable and usable as a PWA.

Requirements:
- Web app manifest.
- Application icons.
- Standalone display mode.
- Service worker.
- Appropriate offline caching.
- Locally bundled game assets.
- Responsive layouts.
- Safe-area support on iOS.
- Appropriate theme colours.
- Reliable application updates.

Do not cache private cloud data in a way that exposes it to another user on a shared device.

Provide a logout mechanism that handles locally cached account data appropriately.

---

# 16. Development Roadmap

Implement the project in distinct phases.

Do not attempt to build all future biomes and advanced game mechanics before the core application is stable.

## Phase 0 — Repository inspection and architecture

Before writing code:

1. Inspect the existing repository.
2. Identify its current framework and architecture.
3. Check existing components, dependencies and data structures.
4. Identify any existing application functionality worth preserving.
5. Propose the folder structure and major architectural decisions.
6. Identify potential technical risks.

Do not blindly replace existing files or functionality.

If the repository is empty, scaffold the project using the technology stack above.

Provide a short implementation plan before proceeding.

## Phase 1 — Functional habit tracker foundation

Implement:
- Responsive application shell.
- Navigation.
- Growth habits.
- Challenges.
- Daily check-ins.
- Manual Screen Time tracking.
- Habit history.
- Basic insights.
- Nature Energy rewards.
- IndexedDB persistence.
- JSON backup and restore.
- Guest mode.

At this stage, the application should already be useful as a habit tracker.

## Phase 2 — Focus timer and Woodland Sanctuary

Implement:
- Focus timer.
- Species selection.
- Focus session persistence.
- Session completion.
- Permanent tree planting.
- Initial tree species.
- Tree growth stages.
- Woodland terrain.
- Reusable pixel-art sprites.
- Basic ambient animations.
- Tree placement.
- Woodland area persistence.

This phase should deliver the first genuinely enjoyable Habitat experience.

## Phase 3 — Collection and woodland progression

Implement:
- Tree collection.
- Species unlocking.
- Focus milestones.
- Permanent tree records.
- Woodland expansion.
- Multiple woodland areas.
- Miniature woodland overview.
- Basic wildlife.
- Discoveries and achievements.

## Phase 4 — Supabase authentication and cloud integration

Implement the Supabase stages described in Section 14:

1. Supabase project configuration.
2. Authentication.
3. Habitat-specific database schema.
4. RLS.
5. Guest-to-account migration.
6. Local-first cloud synchronisation.
7. Multi-device testing.

Do not remove or replace IndexedDB.

## Phase 5 — Additional natural biomes

Implement:
- Frozen Tundra.
- Golden Savannah.
- Whispering Marsh.

Each should have its own terrain, trees, vegetation, wildlife and environmental identity.

Introduce biome unlocking and the world overview.

## Phase 6 — Fantasy biomes and world expansion

Implement:
- Skybound Peaks.
- Enchanted Fairy Forest.

Introduce more unusual plants, magical creatures, rare discoveries and special decorations.

Keep the biome system extensible so further environments can be added through data and assets.

## Phase 7 — Polish and additional features

Potential additions:
- Day/night cycles.
- Weather.
- Seasonal changes.
- Ambient sound.
- Background music.
- Advanced wildlife behaviour.
- Additional decorations.
- More achievements.
- Additional insights.
- Improved world map.
- Accessibility improvements.
- Performance optimisation.

These features should not delay the core product.

---

# 17. Important Product Principles

These principles must guide all implementation decisions.

1. **Local-first:** Core functionality must work without an account or internet connection.
2. **Cross-platform:** Mobile and desktop are both first-class experiences.
3. **Permanent progression:** Completed focus sessions and planted trees must never disappear because of missed habits.
4. **Recoverable challenges:** Negative habits must not permanently damage the ecosystem.
5. **Meaningful collection:** Different species should have genuinely distinct visual identities.
6. **Expandable world:** New biomes should be addable without restructuring the entire game.
7. **Modular architecture:** React, Phaser, persistence and synchronisation must remain separated.
8. **Data-driven content:** Species, biomes, rewards and unlock requirements should be configurable.
9. **No unnecessary recurring costs:** Prefer free services and local functionality.
10. **No premature complexity:** Build and validate the core experience before implementing advanced systems.

---

# 18. Instructions for Claude Code

Please approach this as a long-term application rather than a one-shot prototype.

Start by inspecting the existing repository and reporting:

1. Current project structure.
2. Existing implementation and reusable components.
3. Recommended architecture.
4. Proposed folder structure.
5. Dependencies that need to be added.
6. Any conflicts with existing code.
7. A practical implementation plan.

Then begin Phase 1.

Important:
- Implement in manageable increments.
- Keep the application runnable after each increment.
- Do not implement every future feature immediately.
- Do not generate placeholder screens that look complete but have no functionality.
- Do not introduce Supabase until the local-first foundation is ready.
- However, keep the data architecture compatible with future Supabase synchronisation.
- Do not hardcode the application around a single woodland biome.
- Do not sacrifice mobile usability for desktop layouts or vice versa.
- Use reusable components and maintainable TypeScript.
- Include appropriate error handling and validation.
- Test important functionality as it is implemented.
- Document significant architectural decisions.

After completing each phase, summarise:
- What was implemented.
- Files created or modified.
- How to run and test it.
- Known limitations.
- Recommended next steps.

The immediate objective is a functional foundation that can progressively evolve into the full Habitat experience described above.