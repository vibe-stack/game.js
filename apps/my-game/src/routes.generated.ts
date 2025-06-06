// Auto-generated routes
import { GameRouter } from '@game.js/core';

const router = GameRouter.getInstance();

router.registerRoute('/', () => import('./app/scene'));

export default router;
