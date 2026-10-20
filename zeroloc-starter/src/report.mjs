import { relative, resolve } from 'node:path';

export function toSarif(report) {
  const codes = [...new Set(report.issues.map(i=>i.code))].sort();
  return {
    version:'2.1.0', $schema:'https://json.schemastore.org/sarif-2.1.0.json',
    runs:[{
      tool:{driver:{name:report.tool,version:report.version,rules:codes.map(id=>({id,shortDescription:{text:id.replaceAll('_',' ')}}))}},
      results:report.issues.map(issue=>({
        ruleId:issue.code,level:issue.level,message:{text:issue.message},
        locations:[{physicalLocation:{artifactLocation:{uri:relative(process.cwd(),resolve(issue.locale)).replaceAll('\\','/').split('/').map(encodeURIComponent).join('/')}},logicalLocations:[{fullyQualifiedName:issue.key}]}]
      })),
      invocations:[{executionSuccessful:true}], properties:{passed:report.passed,limitations:report.limitations}
    }]
  };
}
