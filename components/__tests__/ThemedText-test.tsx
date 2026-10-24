import { render } from '@testing-library/react-native';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, async () => {
  const tree = (await render(<ThemedText>Snapshot test!</ThemedText>)).toJSON();

  expect(tree).toMatchSnapshot();
});
