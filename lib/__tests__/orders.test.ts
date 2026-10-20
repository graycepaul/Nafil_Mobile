import { cancelOrder } from '../orders';

describe('cancelOrder', () => {
  it('calls the cancel_order function with the order id and reports success as undefined', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    expect(await cancelOrder({ rpc } as never, 'order-1')).toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('cancel_order', { p_order_id: 'order-1' });
  });

  it('turns the database refusal into plain language', async () => {
    const rpc = jest.fn().mockResolvedValue({
      error: { code: 'P0001', message: 'only an order that is still awaiting transfer can be cancelled' },
    });
    expect(await cancelOrder({ rpc } as never, 'order-1')).toMatch(/already been paid/);
  });
});
