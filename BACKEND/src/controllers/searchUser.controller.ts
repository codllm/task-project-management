import { Request, Response } from 'express';
const userSuggestion = require("../services/searchUser.service").userSuggestion;
module.exports.usersearch = async (req: Request, res: Response) => {
  try{
    const query = req.params.qurey;
    const user = req.user;
    const searchResult = await userSuggestion(query);
    res.status(200).json(searchResult);
  }catch(error){
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports.searchProject = async (req: Request, res: Response) =>{
  try{
    const query = req.params.query;
    const user = req.user;
    const searchResult = await userSuggestion(query);
    res.status(200).json(searchResult);
  }catch(error){
    res.status(500).json({ message: "Internal Server Error" });
  }
}
module.exports.workspaceSearch = async (req: Request, res: Response) =>{
  try{
    const query = req.params.query;
    const user = req.user;
    const searchResult = await userSuggestion(query);
    res.status(200).json(searchResult);
  }catch(error){
    res.status(500).json({ message: "Internal Server Error" });
  }
}