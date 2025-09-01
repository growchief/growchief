import {
  Global,
  Injectable,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { Connection } from '@temporalio/client';

@Injectable()
export class TemporalRegister implements OnModuleInit {
  constructor(private _client: TemporalService) {}

  async onModuleInit(): Promise<void> {
    const connection = this._client?.getClient()?.getRawClient()
      ?.connection as Connection;

    const { customAttributes } =
      await connection.operatorService.listSearchAttributes({
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      });

    const neededAttribute = ['workflowId', 'nodeId', 'botId', 'organizationId'];
    const missingAttributes = neededAttribute.filter(
      (attr) => !customAttributes[attr],
    );

    if (missingAttributes.length > 0) {
      await connection.operatorService.addSearchAttributes({
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        searchAttributes: missingAttributes.reduce((all, current) => {
          all[current] = 1;
          return all;
        }, {}),
      });
    }
  }
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [TemporalRegister],
  get exports() {
    return this.providers;
  },
})
export class TemporalRegisterMissingSearchAttributesModule {}
