# assignment-one

## How To Use CLI

bun run index.ts --endpoint <endpoint> --pathParam <value>


## --endpoint supported options
- `entry`
- `region`
- `category`

## --pathParam supported options vary on endpoint

### entry
Allows for any id or name of a compendium entry within BOTW.

Examples:
- `bun run index.ts --endpoint entry --pathParam moblin`
- `bun run index.ts --endpoint entry --pathParam 'master sword'`
- `bun run index.ts --endpoint entry --pathParam 156`

### region
Allows for the name only for any region.

Examples:
- `bun run index.ts --endpoint region --pathParam eldin`
- `bun run index.ts --endpoint region --pathParam 'dueling peaks'`

### category
Allows for a name of a category specified on the API documentation.

Categories:
- Creatures
- Equipment
- Materials
- Monsters
- Treasure

Example:
- `bun run index.ts --endpoint category --pathParam monsters`