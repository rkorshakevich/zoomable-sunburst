import { PanelPlugin, FieldConfigProperty } from '@grafana/data';
import { SimpleOptions, CustomFieldOptions } from './types';
import { ZoomableSunburst } from './ZoomableSunburst';

export const plugin = new PanelPlugin<SimpleOptions, CustomFieldOptions>(ZoomableSunburst)
  .setPanelOptions(builder => {
    return builder
      .addSelect({
        path: 'colorSchemeSetting',
        name: 'Color scheme',
        settings: {
          options: [
            {
              value: 'tableau',
              label: 'Tableau',
            },
            {
              value: 'rainbow',
              label: 'Rainbow',
            },
            {
              value: 'sinebow',
              label: 'Sinebow',
            },
            {
              value: 'pastel',
              label: 'Pastel',
            },
            {
              value: 'schemeSet3',
              label: 'Scheme Set',
            },
            {
              value: 'interpolateWarm',
              label: 'Warm',
            },
            {
              value: 'interpolateCool',
              label: 'Cool',
            },
          ],
        },
        defaultValue: 'rainbow',
      })
      .addNumberInput({
        path: 'depthLimit',
        defaultValue: 3,
        name: 'Tree depth limit.',
        settings: {
          integer: true,
          min: 2,
          step: 1,
        },
      });
  })
  .useFieldConfig({
    useCustomConfig: builder => {
      builder.addTextInput({
        path: 'fieldDelimiter',
        name: 'Field delimiter',
        defaultValue: '/',
        settings: {
          placeholder: 'delimiter',
          maxLength: 1,
        },
        description: 'Split field on this delimiter.',
      });
    },
    standardOptions: [FieldConfigProperty.Unit, FieldConfigProperty.Decimals],
    standardOptionsDefaults: {
      decimals: 2,
    },
  });
