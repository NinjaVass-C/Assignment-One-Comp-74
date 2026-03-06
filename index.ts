import { parseArgs } from "util";

type Args = {
    api_url: string;
    param: string;
    endpoint: string;
}

type Shrine = {
    name: string
    puzzle: string
}
type Region = {
    name: string
    settlements: string[]
    shrines: Shrine[]
    dlc_shrines: Shrine[]
}

type Entry = {
    name: string
    id: number
    category: string
    description: string
    image: string
    common_locations: string[]
    dlc: boolean
}

type Monster = Entry & {
    drops: string[]
}

type EquipmentProperties = {
    attack: number,
    defense: number
}

type Equipment = Entry & {
    properties: EquipmentProperties
}

type Material = Entry & {
    hearts_recovered: number,
    cooking_effect: string
}

type FoodCreature = Material & {
    edible: boolean,
}

type NonFoodCreature = Monster & {
    edible: boolean,
}

// The api coincidentally matches these two response types together
// But extra type is added for readability.
type Treasure = Monster

function parseCommands() {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            endpoint: {
                type: "string",
                default: undefined,
            },
            pathParam: {
                type: "string",
                default: undefined,
            },
        },
        strict: true,
        allowPositionals: true,
    });
    if (values.pathParam === undefined || values.pathParam === "") {
        throw new Error('Error: No path param provided');
    }

    let param = values.pathParam
    let api_url = ''
    switch (values.endpoint) {
        case 'entry':
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/compendium/entry/'
            break
        case 'region':
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/regions/'
            break
        case 'category':
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/compendium/category/'
            break
        default:
            throw new Error('Unsupported endpoint : ' + values.endpoint)
    }
    let args: Args = {
        api_url: api_url,
        param: param,
        endpoint: values.endpoint
    }
    return args
}

async function fetchData(args: Args) {
    const url = args.api_url + args.param
    const response = await fetch(url);
    const data: any = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    switch (args.endpoint) {
        case 'entry':
            const entry = data.data
            console.log('Displaying Entry Data')
            console.log('---------------------------')
            formatEntry(entry);
            break;
        case 'region':
            const region = data.data
            console.log('Displaying Region Data')
            console.log('---------------------------')
            formatOutput(region as Region)
            break;
        case 'category':
            const entries = data.data
            console.log('Displaying Category Data: ' + entries.length + ' entries')
            console.log('---------------------------')
            entries.forEach((entry: any) => {
                formatEntry(entry)
            })
            break;
        default:
            throw new Error('Unsupported endpoint : ' + args.endpoint)
    }
}

function formatEntry(data: any) {
    switch (data.category) {
        case 'monsters':
            formatOutput(data as Monster)
            break
        case 'equipment':
            formatOutput(data as Equipment)
            break
        case 'materials':
            formatOutput(data as Material)
            break
        case 'treasure':
            formatOutput(data as Treasure)
            break
        case 'creatures':
            if (data.edible) {
                formatOutput(data as FoodCreature)
            } else {
                formatOutput(data as NonFoodCreature)
            }
            break
        default:
            throw new Error('Invalid category: ' + data.category)
    }
}

function formatOutput(data: any) {

    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            console.log(`${key}: No values found`)
        }
        else {
            console.log(`${key}: ${value}`);
        }
    }
    console.log('---------------------------')
}

async function main() {
    try {
        const args = parseCommands();
        await fetchData(args);

    } catch (error: any) {
        console.log('An error has occured: ' + error.message);
    }
}

main()