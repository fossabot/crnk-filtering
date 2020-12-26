import { FilterSpec } from '../FilterSpec';
import { FilterOperator, NestingOperator } from '../utils/crnk-operators';
import { NestedFilter } from './NestedFilter';

const filterArrayUser = [
  new FilterSpec('user.number', '30000', 'GE'),
  new FilterSpec('user.name', 'Emil', 'LIKE'),
  new FilterSpec('user.contact.email', 'EmilFreyAG@', 'LIKE'),
];

const filterArrayClient = [
  new FilterSpec('client.id', '16512'),
  new FilterSpec('client.name', 'Jag', 'LIKE'),
];

describe('Nested-filtering', () => {
  it('should be created nested filter string with single value', () => {
    const nestedFilter = new NestedFilter([
      new FilterSpec('brandName', 'Mazda       '),
    ]).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"EQ": {"brandName": "Mazda"}}'
    );
  });

  it('should be created nested filter string', () => {
    const nestedFilter = new NestedFilter(filterArrayUser).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"AND": [{"user": {"GE": {"number": "30000"}}}, {"user": {"LIKE": {"name": "Emil%"}}}, {"user": {"contact": {"LIKE": {"email": "EmilFreyAG@%"}}}}]}'
    );
  });

  it('should be created nested filter string with default operators', () => {
    const nestedFilter = new NestedFilter(
      filterArrayClient,
      'OR'
    ).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"OR": [{"client": {"EQ": {"id": "16512"}}}, {"client": {"LIKE": {"name": "Jag%"}}}]}'
    );
  });

  it('should be create nested filter inside another filter string', () => {
    const genericFilterDealer = new NestedFilter(filterArrayUser, 'AND');
    const genericFilterBrand = new NestedFilter(
      filterArrayClient,
      'OR',
      genericFilterDealer.buildFilterString()
    ).getHttpParams();

    expect(decodeURI(genericFilterBrand.toString())).toBe(
      'filter={"OR": [{"client": {"EQ": {"id": "16512"}}}, {"client": {"LIKE": {"name": "Jag%"}}}, {"AND": [{"user": {"GE": {"number": "30000"}}}, {"user": {"LIKE": {"name": "Emil%"}}}, {"user": {"contact": {"LIKE": {"email": "EmilFreyAG@%"}}}}]}]}'
    );
  });

  it('should be created only main inner nested filter', () => {
    const filterArray = [
      new FilterSpec('user.name', '    ', 'LIKE'),
      new FilterSpec('user.contact.email', '', 'LIKE'),
    ];

    const genericFilterClient = new NestedFilter(filterArrayClient, 'OR');
    const genericFilterUser = new NestedFilter(
      filterArray,
      'AND',
      genericFilterClient.buildFilterString()
    ).getHttpParams();

    expect(decodeURI(genericFilterUser.toString())).toBe(
      'filter={"OR": [{"client": {"EQ": {"id": "16512"}}}, {"client": {"LIKE": {"name": "Jag%"}}}]}'
    );
  });

  it('should be created nested filter inside nested string - complex version of setting main filter', () => {
    const filterArrayMoto = [
      new FilterSpec('bike.name', 'Suz', 'LIKE'),
      new FilterSpec('bike.company.email', 'Suzuki', FilterOperator.Like),
    ];

    // not empty
    const nestedFilterMoto = new NestedFilter(
      filterArrayMoto,
      NestingOperator.And
    );

    const filterArrayCar = [
      new FilterSpec('car.name', '    ', 'LIKE'),
      new FilterSpec('car.company.email', '', 'LIKE'),
    ];

    // empty
    const nestedFilterCar = new NestedFilter(
      filterArrayCar,
      'AND',
      nestedFilterMoto.buildFilterString()
    );

    // not empty
    const nestedFilterClient = new NestedFilter(
      filterArrayClient,
      NestingOperator.Or,
      nestedFilterCar.buildFilterString()
    );

    const filterArrayUsers = [
      new FilterSpec('user.name', null, 'LIKE'),
      new FilterSpec('user.contact.email', '', 'LIKE'),
    ];

    // empty
    const nestedFilterUsers = new NestedFilter(
      filterArrayUsers,
      'AND',
      nestedFilterClient.buildFilterString()
    ).getHttpParams();

    expect(decodeURI(nestedFilterUsers.toString())).toBe(
      'filter={"OR": [{"client": {"EQ": {"id": "16512"}}}, {"client": {"LIKE": {"name": "Jag%"}}}, {"AND": [{"bike": {"LIKE": {"name": "Suz%"}}}, {"bike": {"company": {"LIKE": {"email": "Suzuki%"}}}}]}]}'
    );
  });

  it('should be empty filter string', () => {
    const filterArray = [
      new FilterSpec('user.name', '    ', 'LIKE'),
      new FilterSpec('user.contact.email', '', 'LIKE'),
    ];
    const nestedFilter = new NestedFilter(filterArray).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe('');
  });

  it('should create filter string with filter values in array', () => {
    const filterArray = [
      new FilterSpec('user.id', [1, 2, 3, undefined], 'EQ'),
      new FilterSpec('user.contact.email', 'emil.frey', 'LIKE'),
      new FilterSpec(
        'user.number',
        [15153, 651515, '  ', 4121, , '', null],
        'EQ'
      ),
    ];
    const nestedFilter = new NestedFilter(filterArray).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"AND": [{"user": {"EQ": {"id": ["1", "2", "3"]}}}, {"user": {"contact": {"LIKE": {"email": "emil.frey%"}}}}, {"user": {"EQ": {"number": ["15153", "651515", "4121"]}}}]}'
    );
  });

  it('should work as nested in main filter string - version with arrays', () => {
    const filterArray = [
      new FilterSpec('user.id', [1, 2, 3, undefined], 'EQ'),
      new FilterSpec('user.contact.email', 'emil.frey', 'LIKE'),
      new FilterSpec(
        'user.code',
        [15153, , , undefined, '651515', '  ', 4121, , '', null, 'Toyota'],
        'EQ'
      ),
    ];
    const nestedFilter = new NestedFilter(filterArray);

    const genericFilterClient = new NestedFilter(
      filterArrayClient,
      'OR',
      nestedFilter.buildFilterString()
    ).getHttpParams();

    expect(decodeURI(genericFilterClient.toString())).toBe(
      'filter={"OR": [{"client": {"EQ": {"id": "16512"}}}, {"client": {"LIKE": {"name": "Jag%"}}}, {"AND": [{"user": {"EQ": {"id": ["1", "2", "3"]}}}, {"user": {"contact": {"LIKE": {"email": "emil.frey%"}}}}, {"user": {"EQ": {"code": ["15153", "651515", "4121", "Toyota"]}}}]}]}'
    );
  });

  it('should create filter string for LIKE operator with filter values in array', () => {
    const filterArray = [
      new FilterSpec('user.id', [125, '', 123, '  ', 512], 'EQ'),
      new FilterSpec('user.name', ['Toy', 'Maz', '', , 'Jagu'], 'LIKE'),
    ];
    const nestedFilter = new NestedFilter(filterArray).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"AND": [{"user": {"EQ": {"id": ["125", "123", "512"]}}}, {"user": {"LIKE": {"name": ["Toy%", "Maz%", "Jagu%"]}}}]}'
    );
  });

  it('should create empty filter string with filter values in array', () => {
    const filterArray = [
      new FilterSpec('user.id', [null, '', '  '], 'EQ'),
      new FilterSpec('user.contact.email', null, 'LIKE'),
    ];
    const nestedFilter = new NestedFilter(filterArray).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe('');
  });

  it('should work with 5 levels of JSON object', () => {
    const filterArray = [
      new FilterSpec('user.id', 12, 'EQ'),
      new FilterSpec('user.address.city.street.apartment', 10, 'GE'),
    ];
    const nestedFilter = new NestedFilter(filterArray).getHttpParams();

    expect(decodeURI(nestedFilter.toString())).toBe(
      'filter={"AND": [{"user": {"EQ": {"id": "12"}}}, {"user": {"address": {"city": {"street": {"GE": {"apartment": "10"}}}}}}]}'
    );
  });
});
