/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { ElementIndex, Structure, StructureElement } from 'molstar/lib/mol-model/structure';
import { StaticStructureComponentTypes, createStructureComponent } from 'molstar/lib/mol-plugin-state/helpers/structure-component';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { MolScriptBuilder } from 'molstar/lib/mol-script/language/builder';
import { Expression } from 'molstar/lib/mol-script/language/expression';
import { UUID } from 'molstar/lib/mol-util';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { capitalize } from 'molstar/lib/mol-util/string';

import { extend, mapArrToObj, pickObjectKeys, sortIfNeeded } from '../helpers/utils';
import { AnnotationStructureComponentParams, createAnnotationStructureComponent } from './annotation-structure-component';


/** Allowed values for a static selector */
export const StaticSelectorChoice = new Choice(mapArrToObj(StaticStructureComponentTypes, t => capitalize(t)), 'all');
export type StaticSelectorChoice = Choice.Values<typeof StaticSelectorChoice>


/** Parameter definition for specifying a part of structure (kinda extension of `StructureComponentParams` from mol-plugin-state/helpers/structure-component) */
export const SelectorParams = PD.MappedStatic('static', {
    static: StaticSelectorChoice.PDSelect(),
    expression: PD.Value<Expression>(MolScriptBuilder.struct.generator.all),
    bundle: PD.Value<StructureElement.Bundle>(StructureElement.Bundle.Empty),
    script: PD.Script({ language: 'mol-script', expression: '(sel.atom.all)' }),
    annotation: PD.Group(pickObjectKeys(AnnotationStructureComponentParams, ['annotationId', 'fieldName', 'fieldValues'])),
}, { description: 'Define a part of the structure where this layer applies (use Static:all to apply to the whole structure)' }
);

/** Parameter values for specifying a part of structure */
export type Selector = PD.Values<{ selector: typeof SelectorParams }>['selector']

/** `Selector` for selecting the whole structure */
export const SelectorAll = { name: 'static', params: 'all' } satisfies Selector;

/** Decide whether a selector is `SelectorAll` */
export function isSelectorAll(props: Selector): props is typeof SelectorAll {
    return props.name === 'static' && props.params === 'all';
}


/** Data structure for fast lookup of a structure element location in a substructure */
export type ElementSet = { [modelId: UUID]: SortedArray<ElementIndex> }

export const ElementSet = {
    /** Create an `ElementSet` from the substructure of `structure` defined by `selector` */
    fromSelector(structure: Structure | undefined, selector: Selector): ElementSet {
        if (!structure) return {};
        const arrays: { [modelId: UUID]: ElementIndex[] } = {};
        const selection = substructureFromSelector(structure, selector); // using `getAtomRangesForRow` might (might not) be faster here
        for (const unit of selection.units) {
            extend(arrays[unit.model.id] ??= [], unit.elements);
        }
        const result: { [modelId: UUID]: SortedArray<ElementIndex> } = {};
        for (const modelId in arrays) {
            const array = arrays[modelId as UUID];
            sortIfNeeded(array, (a, b) => a - b);
            result[modelId as UUID] = SortedArray.ofSortedArray(array);
        }
        return result;
    },
    /** Decide if the element set `set` contains structure element location `location` */
    has(set: ElementSet, location: StructureElement.Location): boolean {
        const array = set[location.unit.model.id];
        return array ? SortedArray.has(array, location.element) : false;
    },
};

function substructureFromSelector(structure: Structure, selector: Selector): Structure {
    const pso = (selector.name === 'annotation') ?
        createAnnotationStructureComponent(structure, { ...selector.params, label: '', nullIfEmpty: false })
        : createStructureComponent(structure, { type: selector, label: '', nullIfEmpty: false }, { source: structure });
    return PluginStateObject.Molecule.Structure.is(pso) ? pso.data : Structure.Empty;
}
