import PocketBase from 'pocketbase';
import { resolve } from 'path';
import { file } from 'bun';

interface PocketBaseConfig {
  url: string;
  username: string;
  password: string;
}

interface CollectionField {
  name: string;
  type: string;
  required: boolean;
  system?: boolean;
  options?: {
    maxSelect?: number;
    collectionId?: string;
  };
}

interface Collection {
  id: string;
  name: string;
  type: string;
  system?: boolean;
  fields: CollectionField[];
}

const toPascalCase = (str: string): string => 
  str.match(/[a-zA-Z0-9]+/g)
    ?.map(word => word[0].toUpperCase() + word.slice(1))
    .join('') || '';

const mapFieldType = (
  field: CollectionField,
  collectionMap: Map<string, string>
): string => {
  // Handle relation fields
  if (field.type === 'relation') {
    const targetId = field.options?.collectionId;
    if (targetId) {
      const targetName = collectionMap.get(targetId);
      if (targetName) {
        const typeName = toPascalCase(targetName);
        const isArray = (field.options?.maxSelect || 1) > 1;
        return `${typeName}${isArray ? '[]' : ''}`;
      }
    }
    return 'string'; // fallback
  }

  const typeMap: Record<string, string> = {
    text: 'string',
    number: 'number',
    bool: 'boolean',
    email: 'string',
    url: 'string',
    date: 'string',
    autodate: 'string',
    select: (field.options?.maxSelect || 1) > 1 ? 'string[]' : 'string',
    file: (field.options?.maxSelect || 1) > 1 ? 'string[]' : 'string',
    password: 'string',
    json: 'any',
  };

  const baseType = typeMap[field.type] || 'any';
  return field.required ? baseType : `${baseType} | null`;
};

async function main() {
  const configPath = resolve(process.cwd(), '.pocketbase.config.ts');
    const config: PocketBaseConfig = await import(configPath).then(m => m.default || m);
    
    console.log('config', config);
  
  const pb = new PocketBase(config.url);
  const auth = await pb.collection('_superusers').authWithPassword(config.username, config.password);
    console.log(auth);

  const collections = (await pb.collections.getFullList() as Collection[])
    .filter(c => c.type !== 'view'); // exclude views

  // Create ID to collection name mapping for relations
  const collectionMap = new Map<string, string>();
  collections.forEach(c => collectionMap.set(c.id, c.name));

  let output = `// Auto-generated by pocketbase-typegen\n`;
  output += `// Generated on ${new Date().toISOString()}\n\n`;
  output += `export interface Base {\n  id: string;\n  created: string;\n  updated: string;\n}\n\n`;

  for (const collection of collections) {
    console.log('Processing collection:', collection.name);
    
    if (!collection.fields) {
      console.warn(`Skipping collection "${collection.name}" - no fields found`);
      continue;
    }

    const interfaceName = toPascalCase(collection.name);
    
    // Generate the main interface
    output += `export interface ${interfaceName} extends Base {\n`;
    
    // Track relation fields for Expand interface
    const relationFields: { name: string; type: string }[] = [];

    for (const field of collection.fields) {
      // Skip base fields
      if (['id', 'created', 'updated'].includes(field.name)) continue;
      
      const fieldType = mapFieldType(field, collectionMap);
      output += `  ${field.name}: ${fieldType};\n`;

      // Track relation fields
      if (field.type === 'relation') {
        const targetId = field.options?.collectionId;
        if (targetId) {
          const targetName = collectionMap.get(targetId);
          if (targetName) {
            const typeName = toPascalCase(targetName);
            const isArray = (field.options?.maxSelect || 1) > 1;
            relationFields.push({
              name: field.name,
              type: `${typeName}${isArray ? '[]' : ''}`
            });
          }
        }
      }
    }

    output += `}\n\n`;

    // Generate Expand interface if there are relations
    if (relationFields.length > 0) {
      output += `export interface ${interfaceName}Expand {\n`;
      relationFields.forEach(({ name, type }) => {
        output += `  ${name}?: ${type};\n`;
      });
      output += `}\n\n`;
    }
  }

  await Bun.write('pb.types.ts', output);
  console.log('Types generated successfully!');
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});