import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CommonLoginDTO {
    @ApiProperty({example: 'test1234', description: '로그인 아이디'})
    @IsString()
    ld_log_id: string

    @ApiProperty({example: '12asd!!AA', description: '로그인 비밀번호'})
    @IsString()
    ld_pwd: string
}