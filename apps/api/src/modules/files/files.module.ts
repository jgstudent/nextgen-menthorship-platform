import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { MinioStorageService } from "./minio-storage.service";

@Module({
  controllers: [FilesController],
  providers: [FilesService, MinioStorageService]
})
export class FilesModule {}
