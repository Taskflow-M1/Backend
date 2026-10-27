import { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../../config/swagger';

const docsRouter = Router();

docsRouter.get('/docs.json', (_req: Request, res: Response) => {
  res.status(200).json(openApiSpec);
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'TaskFlow API — Documentation Swagger',
    swaggerOptions: {
      persistAuthorization: true,
      validatorUrl: null,
    },
  }),
);

export default docsRouter;

