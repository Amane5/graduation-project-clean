abstract class BaseController {
    protected response(data:unknown , message:string = "success" , code:number = 200){
        return { data , message , code}
    }
}

export default  BaseController;