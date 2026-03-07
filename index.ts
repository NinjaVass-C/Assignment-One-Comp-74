import { parseArgs } from 'util';

/**
 * Date: March 6th, 2026
 * Author: Connor Vass
 *
 * Description: A basic CLI tool to validate the endpoints for the
 * Hyrule-Compendium-API. Validates three basic endpoints (see document for more details),
 * with error handling for invalid requests/responses.
 *
 * For more information about the API, visit https://gadhagod.github.io/Hyrule-Compendium-API/#/
 */


// custom types used for accepting arguments and responses

type Args = {
    api_url: string;
    endpoint: string;
}
// used for dlc shrines and shrine responses in region endpoint
type Shrine = {
    name: string
    puzzle: string
}
// response format for region endpoint
type Region = {
    name: string
    settlements: string[]
    shrines: Shrine[]
    dlc_shrines: Shrine[]
}
// base response for use in entry/category endpoint
type Entry = {
    name: string
    id: number
    category: string
    description: string
    image: string
    common_locations: string[]
    dlc: boolean
}
// extra field needed for entry with category monster
type Monster = Entry & {
    drops: string[]
}
// extra field needed for entry with category equipment
type Equipment = Entry & {
    properties: {
        attack: number | null
        defense: number | null
    }
}

// extra fields needed for entry with category material
type Material = Entry & {
    hearts_recovered: number | null,
    cooking_effect: string
}
// response format for category creature that are edible
type FoodCreature = Material & {
    edible: boolean,
}
// response format for category creature that are not edible,
// pulls in fields used in type Monster
type NonFoodCreature = Monster & {
    edible: boolean,
}

// The api coincidentally matches these two response types together
// But extra type is added for readability.
type Treasure = Monster

// parse command line arguments, ensuring valid values are passed
function parseCommands() {
    const { values } = parseArgs({
        args: Bun.argv,
        options: {
            endpoint: {
                type: 'string',
                default: undefined,
            },
            pathParam: {
                type: 'string',
                default: undefined,
            },
        },
        strict: true,
        allowPositionals: true,
    });
    // validate params were passed
    if (values.pathParam === undefined || values.pathParam === '') {
        throw new Error('Error: No path param provided');
    }
    // api only accepts lower case values for path params
    let param = values.pathParam.toLowerCase()
    let api_url = ''

    // switch api url based on endpoint arg
    switch (values.endpoint) {
        case 'entry':
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/compendium/entry/' + param
            break
        case 'region':
            //all is considered a separate endpoint, and is not supported with my cli setup, so error.
            if (param === 'all') {
                throw new Error('Does not support all regions endpoint');
            }
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/regions/' + param
            break
        case 'category':
            api_url = 'https://botw-compendium.herokuapp.com/api/v3/compendium/category/' + param
            break
        default:
            throw new Error('Unsupported endpoint : ' + values.endpoint)
    }
    let args: Args = {
        api_url: api_url,
        endpoint: values.endpoint
    }
    return args
}

// fetches data from api based of cli arguments/validation, then calls associated format for data
async function fetchData(args: Args) {
    const url = args.api_url
    const response = await fetch(url);
    const data: any = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}, error message: ${data.message}`);
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
            // not an entry, so must pass validation type manually
            let validData = validateResponse(region as Region, 'region')
            formatOutput(validData)
            break;
        case 'category':
            const entries = data.data
            console.log('Displaying Category Data: ' + entries.length + ' entries')
            console.log('---------------------------')
            // loop through each entry
            entries.forEach((entry: any) => {
                formatEntry(entry)
            })
            break;
        default:
            throw new Error('Unsupported endpoint : ' + args.endpoint)
    }
}

// function to format each response relating to compendium entries,
// assigning them to their respective custom type
function formatEntry(data: any) {
    let validData = validateResponse(data, data.category)
    formatOutput(validData)
}

// format the console output to make data easier to understand/more readable
function formatOutput(data: Object) {

    for (const [key, value] of Object.entries(data)) {
        // check for how the api returns no data fields, either null, blank, or empty array
        if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            console.log(`${key}: No values found`)
        }
        else {
            // since the region type has a nested type for shrines, iterate through
            // shrines in a separate helper function
            if ((key === 'shrines' || key === 'dlc_shrines')) {
                console.log(`${key}:`)
                outputShrines(value)
                // conditional logic for equipment properties
            } else if (key === 'properties'){
                console.log(`${key}:`)
                if ('attack' in value && value.attack !== 0) {
                    console.log('attack: ' + value.attack)
                    console.log('defense: Offensive equipment - no defensive value')
                } else {
                    console.log('attack: defensive equipment - no offensive value')
                    console.log('defense: ' + value.defense)
                }
            }
            else {
                console.log(`${key}: ${value}`);
            }

        }
    }
    console.log('---------------------------')
}

// Formats information about shrines in a nicer way,
// separate function used for readability.
function outputShrines(shrines: any) {
    const shrineArray: Shrine[] = shrines
    shrineArray.forEach((shrine: Shrine) => {
        console.log('   - name: ' + shrine.name)
        console.log('     puzzle: ' + shrine.puzzle)
    });
}

// based on the response type, ensure that all values are set as expected
// according to the api documentation, then return the data as its corresponding type
function validateResponse(data: any, validation_type: string) {
    let isValid = true;
    let validatedData = data
    switch (validation_type) {
        case 'monsters':
            isValid = validateMonsters(data)
            if (isValid) {
                validatedData = data as Monster
            }
            break
        case 'equipment':
            isValid = validateEquipment(data)
            if (isValid) {
                validatedData = data as Equipment
            }
            break
        case 'materials':
            isValid = validateMaterials(data)
            if (isValid) {
                validatedData = data as Material
            }
            break
        case 'treasure':
            isValid = validateTreasure(data)
            if (isValid) {
                validatedData = data as Treasure
            }
            break
        case 'creatures':
            if (data.edible) {
                isValid = validateFoodCreature(data)
                if (isValid) {
                    validatedData = data as FoodCreature
                }
            } else {
                isValid = validateNonFoodCreature(data)
                if (isValid) {
                    validatedData = data as NonFoodCreature
                }
            }
            break
        case 'region':
            isValid = validateRegion(data)
            if (isValid) {
                validatedData = data as Region
            }
            break
        default:
            throw new Error('Validation type is not a valid type, api validation failed')
    }

    if (!isValid) {
        throw new Error('Data does not match with validation type ' + validation_type + ', api validation failed')
    }

    return validatedData
}

function validateBaseEntry(entry: any) {
    return typeof entry.id === 'number' &&
        typeof entry.name === 'string' &&
        typeof entry.category === 'string' &&
        typeof entry.description === 'string' &&
        typeof entry.image === 'string' &&
        typeof entry.common_locations === 'object' &&
        typeof entry.dlc === 'boolean'
}

function validateNonFoodCreature(entry: any) {
    console.log(typeof entry.edible)
    return validateMonsters(entry) &&
        typeof entry.edible === 'boolean'
}
function validateFoodCreature(entry: any) {
    return validateMaterials(entry) &&
        typeof entry.edible === 'boolean'
}
function validateRegion(entry: any) {
        return typeof entry.name === 'string' &&
            typeof entry.settlements === 'object' &&
            typeof entry.shrines === 'object' &&
            typeof entry.dlc_shrines === 'object'
}
function validateEquipment(entry: any) {
    return validateBaseEntry(entry) &&
        typeof entry.properties === 'object' &&
        (typeof entry.properties.attack === 'number' || entry.properties.attack === null) &&
        (typeof entry.properties.defense === 'number' || entry.properties.defense === null)
}
function validateTreasure(entry: any) {
    return validateMonsters(entry)
}
function validateMaterials(entry: any) {
    return validateBaseEntry(entry) &&
        typeof (entry.hearts_recovered === 'number' || entry.hearts_recovered === null) &&
        typeof entry.cooking_effect === 'string'
}
function validateMonsters(entry: any) {
    console.log(typeof entry.drops)
    return validateBaseEntry(entry) &&
        typeof entry.drops === 'object'
}

// main function
async function main() {
    try {
        const args = parseCommands();
        await fetchData(args);

    } catch (error: any) {
        console.log('An error has occured: ' + error.message);
    }
}

main()