import { describe, it, expect } from 'vitest';
import { mapCountryResponse, mapCountryDetails, type CountryRaw } from './index';

const USA: CountryRaw = {
  name: 'United States of America',
  alpha2Code: 'US',
  alpha3Code: 'USA',
  capital: 'Washington, D.C.',
  region: 'Americas',
  subregion: 'North America',
  population: 329_484_123,
  area: 9_372_610,
  currencies: [{ code: 'USD', name: 'United States dollar', symbol: '$' }],
  languages: [{ iso639_1: 'en', name: 'English' }],
  callingCodes: ['1'],
  topLevelDomain: ['.us'],
  borders: ['CAN', 'MEX'],
  flag: 'https://countries.dev/flags/us.svg',
};

describe('mapCountryResponse', () => {
  it('маппит реальный ответ countries.dev', () => {
    expect(mapCountryResponse(USA)).toEqual({
      name: 'United States of America',
      flag: 'https://countries.dev/flags/us.svg',
      capital: 'Washington, D.C.',
      region: 'Americas',
      population: 329_484_123,
      languages: ['English'],
    });
  });

  it('дефолты на минимальном ответе', () => {
    expect(mapCountryResponse({ name: 'Y' })).toEqual({
      name: 'Y',
      flag: '',
      capital: '',
      region: '',
      population: 0,
      languages: [],
    });
  });

  it('обрабатывает несколько языков', () => {
    const r = mapCountryResponse({
      name: 'Switzerland',
      languages: [{ name: 'German' }, { name: 'French' }, { name: 'Italian' }],
    });
    expect(r.languages).toEqual(['German', 'French', 'Italian']);
  });

  it('не мутирует входной объект', () => {
    const clone = structuredClone(USA);
    mapCountryResponse(USA);
    expect(USA).toEqual(clone);
  });
});

describe('mapCountryDetails', () => {
  it('добавляет площадь, границы, валюты, субрегион, код', () => {
    expect(mapCountryDetails(USA)).toMatchObject({
      area: 9_372_610,
      borders: ['CAN', 'MEX'],
      currencies: ['United States dollar'],
      subregion: 'North America',
      alpha3Code: 'USA',
    });
  });

  it('дефолты на минимальном ответе', () => {
    expect(mapCountryDetails({ name: 'Z' })).toMatchObject({
      area: 0,
      borders: [],
      currencies: [],
      subregion: '',
      alpha3Code: '',
    });
  });
});
