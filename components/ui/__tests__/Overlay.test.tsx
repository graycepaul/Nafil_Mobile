import { act, create } from 'react-test-renderer';
import { BackHandler, Platform, Text } from 'react-native';
import { Overlay } from '../Overlay';

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('../../../context/theme-context', () => ({ useTheme: () => ({ isDark: false }) }));

type Handler = () => boolean;

describe('Overlay and the Android Back button (M8)', () => {
  const original = Platform.OS;
  let handlers: Handler[];
  let removed: number;

  beforeEach(() => {
    handlers = [];
    removed = 0;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, handler: Handler) => {
      handlers.push(handler);
      return { remove: () => { removed += 1; } };
    }) as never);
  });
  afterEach(() => {
    Platform.OS = original;
    jest.restoreAllMocks();
  });

  const render = (visible: boolean, onDismiss: () => void) =>
    create(
      <Overlay visible={visible} onDismiss={onDismiss}>
        <Text>dialog</Text>
      </Overlay>
    );

  it('closes the dialog on Back instead of leaving the screen, and swallows the press', () => {
    Platform.OS = 'android';
    const onDismiss = jest.fn();
    act(() => { render(true, onDismiss); });
    expect(handlers).toHaveLength(1);
    expect(handlers[0]()).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not listen while hidden, and stops listening when it closes', () => {
    Platform.OS = 'android';
    const onDismiss = jest.fn();
    let tree!: ReturnType<typeof create>;
    act(() => { tree = render(false, onDismiss); });
    expect(handlers).toHaveLength(0);
    act(() => { tree.update(<Overlay visible onDismiss={onDismiss}><Text>dialog</Text></Overlay>); });
    expect(handlers).toHaveLength(1);
    act(() => { tree.update(<Overlay visible={false} onDismiss={onDismiss}><Text>dialog</Text></Overlay>); });
    expect(removed).toBe(1);
  });

  it('calls the latest onDismiss without re-subscribing when the parent re-renders', () => {
    Platform.OS = 'android';
    const first = jest.fn();
    const second = jest.fn();
    let tree!: ReturnType<typeof create>;
    act(() => { tree = render(true, first); });
    act(() => { tree.update(<Overlay visible onDismiss={second}><Text>dialog</Text></Overlay>); });
    expect(handlers).toHaveLength(1);
    handlers[0]();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does nothing on iOS, where the system has no Back button', () => {
    Platform.OS = 'ios';
    act(() => { render(true, jest.fn()); });
    expect(handlers).toHaveLength(0);
  });
});
